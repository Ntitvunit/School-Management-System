-- =====================================================================
-- App setup: schools, staff/parent profiles, class arms, and security rules.
-- Run ONCE in the Supabase SQL Editor, after the curriculum parts.
-- =====================================================================

create table if not exists schools (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  join_code        text unique not null default upper(substr(md5(random()::text), 1, 6)),
  current_session  text not null default '2026/2027',
  current_term     smallint not null default 1 check (current_term between 1 and 3),
  current_week     smallint not null default 1 check (current_week between 1 and 14),
  created_at       timestamptz default now()
);

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  school_id   uuid references schools(id) on delete cascade,
  full_name   text,
  role        text not null default 'teacher' check (role in ('admin','teacher','parent')),
  created_at  timestamptz default now()
);

create table if not exists class_arms (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  class_code  text not null references class_levels(code),
  arm         text not null default 'A',
  unique (school_id, class_code, arm)
);

-- helpers used by the security rules
create or replace function my_school_id() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;

create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- a new user creates a school and becomes its admin
create or replace function create_school(p_school_name text, p_full_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_school uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if exists (select 1 from profiles where id = auth.uid() and school_id is not null) then
    raise exception 'You already belong to a school';
  end if;
  insert into schools (name) values (trim(p_school_name)) returning id into v_school;
  insert into profiles (id, school_id, full_name, role) values (auth.uid(), v_school, trim(p_full_name), 'admin')
    on conflict (id) do update set school_id = excluded.school_id, full_name = excluded.full_name, role = 'admin';
  insert into class_arms (school_id, class_code, arm) select v_school, code, 'A' from class_levels;
  return v_school;
end $$;

-- a teacher or parent joins with the school's 6-character code
create or replace function join_school(p_code text, p_full_name text, p_role text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_school uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if p_role not in ('teacher','parent') then raise exception 'Role must be teacher or parent'; end if;
  select id into v_school from schools where join_code = upper(trim(p_code));
  if v_school is null then raise exception 'That school code was not found. Check it with your school admin.'; end if;
  insert into profiles (id, school_id, full_name, role) values (auth.uid(), v_school, trim(p_full_name), p_role)
    on conflict (id) do update set school_id = excluded.school_id, full_name = excluded.full_name, role = excluded.role;
  return v_school;
end $$;

-- link coverage and lesson notes to class arms
alter table lesson_notes  drop constraint if exists lesson_notes_class_arm_fk;
alter table lesson_notes  add constraint lesson_notes_class_arm_fk  foreign key (class_arm_id) references class_arms(id) on delete set null;
alter table topic_coverage drop constraint if exists topic_coverage_class_arm_fk;
alter table topic_coverage add constraint topic_coverage_class_arm_fk foreign key (class_arm_id) references class_arms(id) on delete cascade;
alter table lesson_notes  add column if not exists updated_at timestamptz default now();

-- ---------------------------------------------------------------------
-- Security rules: everyone only sees their own school's records
-- ---------------------------------------------------------------------
alter table schools    enable row level security;
alter table profiles   enable row level security;
alter table class_arms enable row level security;

drop policy if exists "See own school" on schools;
create policy "See own school" on schools for select to authenticated using (id = my_school_id());
drop policy if exists "Admin updates own school" on schools;
create policy "Admin updates own school" on schools for update to authenticated
  using (id = my_school_id() and my_role() = 'admin') with check (id = my_school_id());

drop policy if exists "See people in own school" on profiles;
create policy "See people in own school" on profiles for select to authenticated
  using (id = auth.uid() or school_id = my_school_id());
drop policy if exists "Update own name" on profiles;
create policy "Update own name" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = my_role() and school_id is not distinct from my_school_id());

drop policy if exists "See own school arms" on class_arms;
create policy "See own school arms" on class_arms for select to authenticated using (school_id = my_school_id());
drop policy if exists "Admin manages arms" on class_arms;
create policy "Admin manages arms" on class_arms for all to authenticated
  using (school_id = my_school_id() and my_role() = 'admin') with check (school_id = my_school_id() and my_role() = 'admin');

-- lesson notes: teachers see their own; admins see all in the school
drop policy if exists "Read lesson notes" on lesson_notes;
create policy "Read lesson notes" on lesson_notes for select to authenticated
  using (school_id = my_school_id() and (teacher_id = auth.uid() or my_role() = 'admin'));
drop policy if exists "Teachers write own notes" on lesson_notes;
create policy "Teachers write own notes" on lesson_notes for insert to authenticated
  with check (school_id = my_school_id() and teacher_id = auth.uid() and my_role() in ('teacher','admin'));
drop policy if exists "Edit lesson notes" on lesson_notes;
create policy "Edit lesson notes" on lesson_notes for update to authenticated
  using (school_id = my_school_id() and (teacher_id = auth.uid() or my_role() = 'admin'))
  with check (school_id = my_school_id());
drop policy if exists "Delete own draft notes" on lesson_notes;
create policy "Delete own draft notes" on lesson_notes for delete to authenticated
  using (school_id = my_school_id() and teacher_id = auth.uid() and status = 'draft');

-- coverage: everyone in the school can see it; teachers and admins record it
drop policy if exists "Read coverage" on topic_coverage;
create policy "Read coverage" on topic_coverage for select to authenticated using (school_id = my_school_id());
drop policy if exists "Record coverage" on topic_coverage;
create policy "Record coverage" on topic_coverage for all to authenticated
  using (school_id = my_school_id() and my_role() in ('teacher','admin'))
  with check (school_id = my_school_id() and my_role() in ('teacher','admin'));

drop policy if exists "Read subject settings" on school_subject_settings;
create policy "Read subject settings" on school_subject_settings for select to authenticated using (school_id = my_school_id());
drop policy if exists "Admin subject settings" on school_subject_settings;
create policy "Admin subject settings" on school_subject_settings for all to authenticated
  using (school_id = my_school_id() and my_role() = 'admin') with check (school_id = my_school_id() and my_role() = 'admin');

drop policy if exists "Read topic overrides" on school_topic_overrides;
create policy "Read topic overrides" on school_topic_overrides for select to authenticated using (school_id = my_school_id());

drop policy if exists "Read approved resources" on digital_resources;
create policy "Read approved resources" on digital_resources for select to authenticated using (is_approved);
drop policy if exists "Read topic resources" on topic_resources;
create policy "Read topic resources" on topic_resources for select to authenticated using (true);

grant execute on function create_school(text, text) to authenticated;
grant execute on function join_school(text, text, text) to authenticated;
