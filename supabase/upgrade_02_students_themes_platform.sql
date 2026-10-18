-- =====================================================================
-- Upgrade 2: school themes, student records, parent links, platform owner.
-- Run ONCE in the Supabase SQL Editor (after app_setup.sql). Safe to re-run.
-- =====================================================================

-- ---------- 1. School themes and status ----------
alter table schools add column if not exists theme         text not null default 'chalkboard';
alter table schools add column if not exists brand_primary text;   -- custom colour, e.g. '#1d5c4a'
alter table schools add column if not exists brand_accent  text;   -- custom colour, e.g. '#c98a00'
alter table schools add column if not exists motto         text;
alter table schools add column if not exists status        text not null default 'active';
alter table schools drop constraint if exists schools_status_check;
alter table schools add constraint schools_status_check check (status in ('active','suspended'));

-- ---------- 2. Platform owner (you, the developer) ----------
create table if not exists platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table platform_admins enable row level security;
-- No policies: nobody can read or change this table from the app. You add yourself in the SQL Editor.

create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;
grant execute on function is_platform_admin() to authenticated;

-- school admins cannot un-suspend their own school
create or replace function guard_school_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is empty in the SQL Editor, so you can always change it there.
  if new.status is distinct from old.status and auth.uid() is not null and not is_platform_admin() then
    raise exception 'Only the platform owner can change a school''s status';
  end if;
  return new;
end $$;
drop trigger if exists schools_status_guard on schools;
create trigger schools_status_guard before update on schools for each row execute function guard_school_status();

-- overview of all schools: counts only, no personal data
create or replace function platform_overview()
returns table (id uuid, name text, status text, created_at timestamptz, admin_name text,
               teachers bigint, parents bigint, students bigint, lesson_notes bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'Not allowed'; end if;
  return query
  select s.id, s.name, s.status, s.created_at,
         (select p.full_name from profiles p where p.school_id = s.id and p.role = 'admin' order by p.created_at limit 1),
         (select count(*) from profiles p where p.school_id = s.id and p.role = 'teacher'),
         (select count(*) from profiles p where p.school_id = s.id and p.role = 'parent'),
         (select count(*) from students st where st.school_id = s.id and st.status = 'active'),
         (select count(*) from lesson_notes n where n.school_id = s.id)
  from schools s order by s.created_at desc;
end $$;

create or replace function platform_set_school_status(p_school uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'Not allowed'; end if;
  update schools set status = p_status where id = p_school;
end $$;

-- ---------- 3. Students ----------
create table if not exists students (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  admission_no    text not null,
  first_name      text not null,
  last_name       text not null,
  other_names     text,
  gender          text check (gender in ('female','male')),
  date_of_birth   date,
  class_arm_id    uuid references class_arms(id) on delete set null,
  guardian_name   text,
  guardian_phone  text,
  guardian_email  text,
  address         text,
  medical_notes   text,
  status          text not null default 'active' check (status in ('active','graduated','withdrawn')),
  admitted_on     date default current_date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (school_id, admission_no)
);
create index if not exists students_class_idx on students (school_id, class_arm_id);

-- which parent accounts can see which children
create table if not exists student_guardians (
  school_id   uuid not null references schools(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  parent_id   uuid not null references profiles(id) on delete cascade,
  relationship text,
  primary key (student_id, parent_id)
);

create or replace function is_my_child(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from student_guardians where student_id = p_student and parent_id = auth.uid())
$$;

alter table students          enable row level security;
alter table student_guardians enable row level security;

drop policy if exists "Staff see school students, parents see own children" on students;
create policy "Staff see school students, parents see own children" on students for select to authenticated
  using (school_id = my_school_id() and (my_role() in ('admin','teacher') or is_my_child(id)));
drop policy if exists "Admin manages students" on students;
create policy "Admin manages students" on students for all to authenticated
  using (school_id = my_school_id() and my_role() = 'admin')
  with check (school_id = my_school_id() and my_role() = 'admin');

drop policy if exists "See guardian links" on student_guardians;
create policy "See guardian links" on student_guardians for select to authenticated
  using (school_id = my_school_id() and (parent_id = auth.uid() or my_role() in ('admin','teacher')));
drop policy if exists "Admin manages guardian links" on student_guardians;
create policy "Admin manages guardian links" on student_guardians for all to authenticated
  using (school_id = my_school_id() and my_role() = 'admin')
  with check (school_id = my_school_id() and my_role() = 'admin');

-- ---------- 4. Suspended schools lose access to school data ----------
create or replace function my_school_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.school_id from profiles p join schools s on s.id = p.school_id
  where p.id = auth.uid() and s.status = 'active'
$$;

-- profiles: a user can always read their own profile (even if the school is suspended)
-- (policy "See people in own school" from app_setup.sql already includes id = auth.uid())

-- schools: a user can read their own school's name/status even when suspended
create or replace function my_school_id_any() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;
drop policy if exists "See own school" on schools;
create policy "See own school" on schools for select to authenticated using (id = my_school_id_any());
