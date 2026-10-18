-- =====================================================================
-- Upgrade 3: full programme
--   school setup (levels, assessment, grading, subjects), staff roles,
--   results and report cards, attendance, finance, announcements,
--   student logins, scratch-card PINs, score change log.
-- Run ONCE in the Supabase SQL Editor after upgrade 2. Safe to re-run.
-- =====================================================================

-- ---------- 1. Roles: add bursar and student ----------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin','teacher','bursar','parent','student'));

-- ---------- 2. School setup ----------
alter table schools add column if not exists levels text[] not null default '{pre_primary,primary}';
alter table schools add column if not exists assessment jsonb not null default
  '[{"key":"ca1","label":"1st CA","max":20},{"key":"ca2","label":"2nd CA","max":20},{"key":"exam","label":"Exam","max":60}]';
alter table schools add column if not exists grading jsonb not null default
  '[{"min":70,"grade":"A","remark":"Excellent"},{"min":60,"grade":"B","remark":"Very good"},{"min":50,"grade":"C","remark":"Good"},{"min":45,"grade":"D","remark":"Fair"},{"min":40,"grade":"E","remark":"Pass"},{"min":0,"grade":"F","remark":"Fail"}]';
alter table schools add column if not exists block_results_if_owing boolean not null default false;
alter table schools add column if not exists next_term_begins date;
alter table schools add column if not exists address text;
alter table schools add column if not exists phone text;

-- Junior and senior secondary classes
insert into class_levels (code, name, level, sort_order) values
  ('JSS1','JSS 1','jss',11),('JSS2','JSS 2','jss',12),('JSS3','JSS 3','jss',13),
  ('SS1','SS 1','sss',14),('SS2','SS 2','sss',15),('SS3','SS 3','sss',16)
on conflict (code) do nothing;
insert into class_arms (school_id, class_code, arm)
  select s.id, c.code, 'A' from schools s cross join class_levels c
  where c.level in ('jss','sss') on conflict do nothing;

-- Default secondary subjects (schools can switch subjects off or add their own)
insert into curricula (id, title, authority_note) values
  ('ng-default-secondary','Default JSS and SSS subject list','Editable defaults until the JSS-SSS scheme of work is loaded')
on conflict (id) do nothing;
insert into subjects (id, name, levels) values
  ('english-language','English Language','{jss,sss}'), ('mathematics','Mathematics','{jss,sss}'),
  ('basic-science','Basic Science','{jss}'), ('basic-technology','Basic Technology','{jss}'),
  ('social-and-citizenship-studies','Social and Citizenship Studies','{jss}'),
  ('nigerian-history','Nigerian History','{jss,sss}'), ('cultural-and-creative-arts','Cultural and Creative Arts','{jss}'),
  ('physical-and-health-education','Physical and Health Education','{jss}'),
  ('christian-religious-studies','Christian Religious Studies','{jss,sss}'), ('islamic-studies','Islamic Studies','{jss,sss}'),
  ('digital-technologies','Digital Technologies','{jss,sss}'), ('business-studies','Business Studies','{jss}'),
  ('prevocational-studies','Prevocational Studies','{jss}'), ('french-language','French Language','{jss,sss}'),
  ('nigerian-language','Nigerian Language','{jss,sss}'), ('civic-education','Civic Education','{sss}'),
  ('biology','Biology','{sss}'), ('chemistry','Chemistry','{sss}'), ('physics','Physics','{sss}'),
  ('further-mathematics','Further Mathematics','{sss}'), ('agricultural-science','Agricultural Science','{sss}'),
  ('geography','Geography','{sss}'), ('economics','Economics','{sss}'), ('government','Government','{sss}'),
  ('literature-in-english','Literature in English','{sss}'), ('financial-accounting','Financial Accounting','{sss}'),
  ('commerce','Commerce','{sss}'), ('technical-drawing','Technical Drawing','{sss}'), ('marketing','Marketing','{sss}')
on conflict (id) do update set levels = (select array(select distinct unnest(subjects.levels || excluded.levels)));

insert into curriculum_offerings (curriculum_id, class_code, subject_id)
  select 'ng-default-secondary', c.code, s.id from class_levels c join subjects s on c.level = any(s.levels)
  where c.level in ('jss','sss') and s.id in (
    'english-language','mathematics','basic-science','basic-technology','social-and-citizenship-studies','nigerian-history',
    'cultural-and-creative-arts','physical-and-health-education','christian-religious-studies','islamic-studies',
    'digital-technologies','business-studies','prevocational-studies','french-language','nigerian-language','civic-education',
    'biology','chemistry','physics','further-mathematics','agricultural-science','geography','economics','government',
    'literature-in-english','financial-accounting','commerce','technical-drawing','marketing')
on conflict do nothing;

-- Admin adds a subject that is not on the default list
create or replace function add_custom_subject(p_name text, p_class_code text) returns text
language plpgsql security definer set search_path = public as $$
declare v_id text;
begin
  if my_role() is distinct from 'admin' then raise exception 'Only the school admin can add subjects'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Enter a subject name'; end if;
  v_id := 'x-' || substr(md5(my_school_id()::text || lower(trim(p_name))), 1, 6) || '-' ||
          trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  insert into subjects (id, name, levels) values (v_id, trim(p_name), '{}') on conflict (id) do nothing;
  insert into school_subject_settings (school_id, class_code, subject_id, enabled)
    values (my_school_id(), p_class_code, v_id, true)
    on conflict (school_id, class_code, subject_id) do update set enabled = true;
  return v_id;
end $$;
grant execute on function add_custom_subject(text, text) to authenticated;

-- ---------- 3. Staff management ----------
alter table class_arms add column if not exists class_teacher_id uuid references profiles(id) on delete set null;

create table if not exists teacher_subjects (
  school_id    uuid not null references schools(id) on delete cascade,
  teacher_id   uuid not null references profiles(id) on delete cascade,
  class_arm_id uuid not null references class_arms(id) on delete cascade,
  subject_id   text not null references subjects(id),
  primary key (teacher_id, class_arm_id, subject_id)
);
alter table teacher_subjects enable row level security;
drop policy if exists "Read teacher subjects" on teacher_subjects;
create policy "Read teacher subjects" on teacher_subjects for select to authenticated using (school_id = my_school_id());
drop policy if exists "Admin manages teacher subjects" on teacher_subjects;
create policy "Admin manages teacher subjects" on teacher_subjects for all to authenticated
  using (school_id = my_school_id() and my_role() = 'admin') with check (school_id = my_school_id() and my_role() = 'admin');

create or replace function set_member_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only the school admin can change roles'; end if;
  if p_user = auth.uid() then raise exception 'You cannot change your own role'; end if;
  if p_role not in ('admin','teacher','bursar') then raise exception 'Role must be admin, teacher or bursar'; end if;
  update profiles set role = p_role where id = p_user and school_id = my_school_id() and role in ('admin','teacher','bursar');
end $$;

create or replace function remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only the school admin can remove people'; end if;
  if p_user = auth.uid() then raise exception 'You cannot remove yourself'; end if;
  delete from student_guardians where parent_id = p_user and school_id = my_school_id();
  update students set user_id = null where user_id = p_user and school_id = my_school_id();
  update profiles set school_id = null where id = p_user and school_id = my_school_id();
end $$;
grant execute on function set_member_role(uuid, text) to authenticated;
grant execute on function remove_member(uuid) to authenticated;

-- ---------- 4. Student logins (mainly SSS) ----------
alter table students add column if not exists user_id uuid unique references profiles(id) on delete set null;
alter table students add column if not exists stream text;  -- e.g. Science, Arts, Commercial

create or replace function join_as_student(p_code text, p_admission_no text, p_full_name text, p_dob date) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_school uuid; v_student students;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select id into v_school from schools where join_code = upper(trim(p_code)) and status = 'active';
  if v_school is null then raise exception 'That school code was not found.'; end if;
  select * into v_student from students where school_id = v_school and upper(admission_no) = upper(trim(p_admission_no));
  if not found then raise exception 'No student with that admission number. Check with the school.'; end if;
  if v_student.user_id is not null and v_student.user_id <> auth.uid() then raise exception 'This student record already has an account.'; end if;
  if v_student.date_of_birth is not null and v_student.date_of_birth is distinct from p_dob then
    raise exception 'Date of birth does not match the school record.';
  end if;
  insert into profiles (id, school_id, full_name, role) values (auth.uid(), v_school, trim(p_full_name), 'student')
    on conflict (id) do update set school_id = excluded.school_id, full_name = excluded.full_name, role = 'student';
  update students set user_id = auth.uid() where id = v_student.id;
  return v_student.id;
end $$;
grant execute on function join_as_student(text, text, text, date) to authenticated;

drop policy if exists "Staff see school students, parents see own children" on students;
create policy "Staff see school students, parents see own children" on students for select to authenticated
  using (school_id = my_school_id() and (my_role() in ('admin','teacher','bursar') or is_my_child(id) or user_id = auth.uid()));

-- ---------- 5. Results ----------
create table if not exists scores (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  session       text not null,
  term          smallint not null check (term between 1 and 3),
  student_id    uuid not null references students(id) on delete cascade,
  subject_id    text not null references subjects(id),
  class_arm_id  uuid references class_arms(id) on delete set null,
  parts         jsonb not null default '{}',
  total         numeric(5,1),
  entered_by    uuid,
  updated_at    timestamptz default now(),
  unique (student_id, session, term, subject_id)
);
create index if not exists scores_class_idx on scores (class_arm_id, session, term);

create table if not exists result_publications (
  school_id     uuid not null references schools(id) on delete cascade,
  class_arm_id  uuid not null references class_arms(id) on delete cascade,
  session       text not null,
  term          smallint not null,
  published_at  timestamptz default now(),
  published_by  uuid,
  primary key (class_arm_id, session, term)
);

create table if not exists term_reports (
  school_id          uuid not null references schools(id) on delete cascade,
  student_id         uuid not null references students(id) on delete cascade,
  session            text not null,
  term               smallint not null,
  class_arm_id       uuid references class_arms(id) on delete set null,
  affective          jsonb not null default '{}',
  psychomotor        jsonb not null default '{}',
  teacher_comment    text,
  principal_comment  text,
  updated_at         timestamptz default now(),
  primary key (student_id, session, term)
);

create table if not exists score_audit (
  id          bigserial primary key,
  school_id   uuid not null,
  student_id  uuid,
  subject_id  text,
  session     text,
  term        smallint,
  action      text,
  old_parts   jsonb,
  new_parts   jsonb,
  old_total   numeric(5,1),
  new_total   numeric(5,1),
  changed_by  uuid,
  changed_at  timestamptz default now()
);

create or replace function log_score_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.parts is distinct from old.parts then
      insert into score_audit (school_id, student_id, subject_id, session, term, action, old_parts, new_parts, old_total, new_total, changed_by)
      values (new.school_id, new.student_id, new.subject_id, new.session, new.term, 'changed', old.parts, new.parts, old.total, new.total, auth.uid());
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into score_audit (school_id, student_id, subject_id, session, term, action, old_parts, old_total, changed_by)
    values (old.school_id, old.student_id, old.subject_id, old.session, old.term, 'deleted', old.parts, old.total, auth.uid());
    return old;
  end if;
  return new;
end $$;
drop trigger if exists scores_audit on scores;
create trigger scores_audit after update or delete on scores for each row execute function log_score_change();

alter table scores              enable row level security;
alter table result_publications enable row level security;
alter table term_reports        enable row level security;
alter table score_audit         enable row level security;

drop policy if exists "Staff read scores" on scores;
create policy "Staff read scores" on scores for select to authenticated
  using (school_id = my_school_id() and my_role() in ('admin','teacher'));
drop policy if exists "Staff write scores until published" on scores;
create policy "Staff write scores until published" on scores for all to authenticated
  using (school_id = my_school_id() and (my_role() = 'admin' or (my_role() = 'teacher' and not exists (
    select 1 from result_publications rp where rp.class_arm_id = scores.class_arm_id and rp.session = scores.session and rp.term = scores.term))))
  with check (school_id = my_school_id() and (my_role() = 'admin' or (my_role() = 'teacher' and not exists (
    select 1 from result_publications rp where rp.class_arm_id = scores.class_arm_id and rp.session = scores.session and rp.term = scores.term))));

drop policy if exists "Members read publications" on result_publications;
create policy "Members read publications" on result_publications for select to authenticated using (school_id = my_school_id());
drop policy if exists "Admin publishes results" on result_publications;
create policy "Admin publishes results" on result_publications for all to authenticated
  using (school_id = my_school_id() and my_role() = 'admin') with check (school_id = my_school_id() and my_role() = 'admin');

drop policy if exists "Staff read term reports" on term_reports;
create policy "Staff read term reports" on term_reports for select to authenticated
  using (school_id = my_school_id() and my_role() in ('admin','teacher'));
drop policy if exists "Staff write term reports" on term_reports;
create policy "Staff write term reports" on term_reports for all to authenticated
  using (school_id = my_school_id() and my_role() in ('admin','teacher'))
  with check (school_id = my_school_id() and my_role() in ('admin','teacher'));

drop policy if exists "Admin reads score log" on score_audit;
create policy "Admin reads score log" on score_audit for select to authenticated
  using (school_id = my_school_id() and my_role() = 'admin');

-- ---------- 6. Attendance ----------
create table if not exists attendance (
  school_id     uuid not null references schools(id) on delete cascade,
  class_arm_id  uuid references class_arms(id) on delete set null,
  student_id    uuid not null references students(id) on delete cascade,
  day           date not null,
  session       text not null,
  term          smallint not null,
  status        text not null check (status in ('present','absent','late')),
  marked_by     uuid,
  primary key (student_id, day)
);
create index if not exists attendance_class_idx on attendance (class_arm_id, day);
alter table attendance enable row level security;
drop policy if exists "Staff read attendance" on attendance;
create policy "Staff read attendance" on attendance for select to authenticated
  using (school_id = my_school_id() and my_role() in ('admin','teacher'));
drop policy if exists "Staff mark attendance" on attendance;
create policy "Staff mark attendance" on attendance for all to authenticated
  using (school_id = my_school_id() and my_role() in ('admin','teacher'))
  with check (school_id = my_school_id() and my_role() in ('admin','teacher'));

-- ---------- 7. Finance ----------
create table if not exists fee_items (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  session     text not null,
  term        smallint not null check (term between 1 and 3),
  class_code  text references class_levels(code),   -- empty = every class
  name        text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  created_at  timestamptz default now()
);
create table if not exists fee_adjustments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  session     text not null,
  term        smallint not null,
  amount      numeric(12,2) not null check (amount >= 0),   -- discount or scholarship
  reason      text,
  created_at  timestamptz default now()
);
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  receipt_no  bigserial,
  school_id   uuid not null references schools(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  session     text not null,
  term        smallint not null,
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null default 'cash' check (method in ('cash','transfer','pos','online','cheque')),
  reference   text,
  paid_on     date not null default current_date,
  received_by uuid,
  note        text,
  created_at  timestamptz default now()
);
alter table fee_items       enable row level security;
alter table fee_adjustments enable row level security;
alter table payments        enable row level security;

drop policy if exists "Members read fee items" on fee_items;
create policy "Members read fee items" on fee_items for select to authenticated using (school_id = my_school_id());
drop policy if exists "Bursary manages fee items" on fee_items;
create policy "Bursary manages fee items" on fee_items for all to authenticated
  using (school_id = my_school_id() and my_role() in ('admin','bursar')) with check (school_id = my_school_id() and my_role() in ('admin','bursar'));
drop policy if exists "Bursary manages adjustments" on fee_adjustments;
create policy "Bursary manages adjustments" on fee_adjustments for all to authenticated
  using (school_id = my_school_id() and my_role() in ('admin','bursar')) with check (school_id = my_school_id() and my_role() in ('admin','bursar'));
drop policy if exists "Bursary manages payments" on payments;
create policy "Bursary manages payments" on payments for all to authenticated
  using (school_id = my_school_id() and my_role() in ('admin','bursar')) with check (school_id = my_school_id() and my_role() in ('admin','bursar'));

-- ---------- 8. Announcements ----------
create table if not exists announcements (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  title       text not null,
  body        text,
  audience    text not null default 'everyone' check (audience in ('everyone','staff','parents','students')),
  created_by  uuid,
  created_at  timestamptz default now()
);
alter table announcements enable row level security;
drop policy if exists "Read announcements" on announcements;
create policy "Read announcements" on announcements for select to authenticated
  using (school_id = my_school_id() and (
    audience = 'everyone' or my_role() = 'admin'
    or (audience = 'staff' and my_role() in ('teacher','bursar'))
    or (audience = 'parents' and my_role() = 'parent')
    or (audience = 'students' and my_role() in ('student','teacher'))));
drop policy if exists "Admin posts announcements" on announcements;
create policy "Admin posts announcements" on announcements for all to authenticated
  using (school_id = my_school_id() and my_role() = 'admin') with check (school_id = my_school_id() and my_role() = 'admin');

-- ---------- 9. Shared calculations (used by report cards and portals) ----------
create or replace function student_fees(p_student uuid, p_session text, p_term smallint) returns jsonb
language sql stable security definer set search_path = public as $$
  with st as (select s.*, a.class_code from students s left join class_arms a on a.id = s.class_arm_id where s.id = p_student),
  items as (select f.name, f.amount from fee_items f, st where f.school_id = st.school_id and f.session = p_session and f.term = p_term
            and (f.class_code is null or f.class_code = st.class_code)),
  adj as (select coalesce(sum(amount),0) v from fee_adjustments where student_id = p_student and session = p_session and term = p_term),
  pay as (select coalesce(sum(amount),0) v from payments where student_id = p_student and session = p_session and term = p_term)
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'amount', amount) order by name) from items), '[]'),
    'billed', (select coalesce(sum(amount),0) from items),
    'discount', (select v from adj),
    'paid', (select v from pay),
    'balance', (select coalesce(sum(amount),0) from items) - (select v from adj) - (select v from pay),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('receipt_no', receipt_no, 'amount', amount, 'method', method, 'paid_on', paid_on) order by paid_on desc)
                          from payments where student_id = p_student and session = p_session and term = p_term), '[]'))
$$;
revoke execute on function student_fees(uuid, text, smallint) from public, anon, authenticated;

create or replace function report_json_internal(p_student uuid, p_session text, p_term smallint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare st students; sch schools; v_arm uuid; arm_label text; lvl text; res jsonb;
begin
  select * into st from students where id = p_student;
  if not found then return null; end if;
  select * into sch from schools where id = st.school_id;
  v_arm := coalesce((select class_arm_id from scores where student_id = p_student and session = p_session and term = p_term and class_arm_id is not null limit 1), st.class_arm_id);
  select c.name || ' ' || a.arm, c.level into arm_label, lvl from class_arms a join class_levels c on c.code = a.class_code where a.id = v_arm;

  with cls as (
    select s.student_id, s.subject_id, s.total from scores s
    where s.class_arm_id = v_arm and s.session = p_session and s.term = p_term and s.total is not null),
  subj_stats as (select subject_id, round(avg(total),1) av, max(total) hi, min(total) lo from cls group by subject_id),
  subj_pos as (select student_id, subject_id, rank() over (partition by subject_id order by total desc) pos from cls),
  overall as (select student_id, sum(total) tot, round(avg(total),2) av, count(*) n from cls group by student_id),
  overall_pos as (select student_id, tot, av, n, rank() over (order by av desc) pos, count(*) over () size from overall)
  select jsonb_build_object(
    'student', jsonb_build_object('id', st.id, 'first_name', st.first_name, 'last_name', st.last_name, 'other_names', st.other_names,
                                  'admission_no', st.admission_no, 'gender', st.gender, 'date_of_birth', st.date_of_birth, 'stream', st.stream),
    'school', jsonb_build_object('name', sch.name, 'motto', sch.motto, 'address', sch.address, 'phone', sch.phone,
                                 'grading', sch.grading, 'assessment', sch.assessment, 'next_term_begins', sch.next_term_begins,
                                 'theme', sch.theme, 'brand_primary', sch.brand_primary, 'brand_accent', sch.brand_accent),
    'class', jsonb_build_object('id', v_arm, 'label', arm_label, 'level', lvl),
    'session', p_session, 'term', p_term,
    'subjects', coalesce((
      select jsonb_agg(jsonb_build_object('subject', sb.name, 'parts', sc.parts, 'total', sc.total,
               'class_avg', ss.av, 'highest', ss.hi, 'lowest', ss.lo, 'position', sp.pos) order by sb.name)
      from scores sc join subjects sb on sb.id = sc.subject_id
      left join subj_stats ss on ss.subject_id = sc.subject_id
      left join subj_pos sp on sp.subject_id = sc.subject_id and sp.student_id = sc.student_id
      where sc.student_id = p_student and sc.session = p_session and sc.term = p_term), '[]'),
    'overall', (select jsonb_build_object('total', tot, 'average', av, 'subjects', n, 'position', pos, 'class_size', size)
                from overall_pos where student_id = p_student),
    'report', (select to_jsonb(tr) - 'school_id' from term_reports tr where tr.student_id = p_student and tr.session = p_session and tr.term = p_term),
    'attendance', (select jsonb_build_object('present', count(*) filter (where status in ('present','late')),
                                             'absent', count(*) filter (where status = 'absent'), 'total', count(*))
                   from attendance a where a.student_id = p_student and a.session = p_session and a.term = p_term),
    'published', exists (select 1 from result_publications rp where rp.class_arm_id = v_arm and rp.session = p_session and rp.term = p_term)
  ) into res;
  return res;
end $$;
revoke execute on function report_json_internal(uuid, text, smallint) from public, anon, authenticated;

-- Report card with access rules: staff any time; parents/students only when published (and fees paid, if the school requires it)
create or replace function get_report_card(p_student uuid, p_session text, p_term smallint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare st students; sch schools; v_arm uuid; bal numeric;
begin
  select * into st from students where id = p_student;
  if not found or st.school_id is distinct from my_school_id() then raise exception 'Report not found'; end if;
  if my_role() in ('admin','teacher') then return report_json_internal(p_student, p_session, p_term); end if;
  if not (is_my_child(p_student) or st.user_id = auth.uid()) then raise exception 'Not allowed'; end if;
  select * into sch from schools where id = st.school_id;
  v_arm := coalesce((select class_arm_id from scores where student_id = p_student and session = p_session and term = p_term and class_arm_id is not null limit 1), st.class_arm_id);
  if not exists (select 1 from result_publications where class_arm_id = v_arm and session = p_session and term = p_term) then
    raise exception 'This result has not been released by the school yet.';
  end if;
  if sch.block_results_if_owing then
    bal := (student_fees(p_student, p_session, p_term) ->> 'balance')::numeric;
    if bal > 0 then raise exception 'This result is held until the school fees for this term are paid. Please contact the school bursar.'; end if;
  end if;
  return report_json_internal(p_student, p_session, p_term);
end $$;
grant execute on function get_report_card(uuid, text, smallint) to authenticated;

-- Everything a parent or student needs on one page
create or replace function get_child_overview(p_student uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare st students; sch schools; arm_label text; staff boolean;
begin
  select * into st from students where id = p_student;
  if not found or st.school_id is distinct from my_school_id() then raise exception 'Not found'; end if;
  staff := my_role() in ('admin','teacher','bursar');
  if not (staff or is_my_child(p_student) or st.user_id = auth.uid()) then raise exception 'Not allowed'; end if;
  select * into sch from schools where id = st.school_id;
  select c.name || ' ' || a.arm into arm_label from class_arms a join class_levels c on c.code = a.class_code where a.id = st.class_arm_id;
  return jsonb_build_object(
    'student', jsonb_build_object('id', st.id, 'name', st.first_name || ' ' || st.last_name, 'admission_no', st.admission_no, 'class', arm_label),
    'session', sch.current_session, 'term', sch.current_term,
    'attendance', (select jsonb_build_object('present', count(*) filter (where status in ('present','late')),
                                             'absent', count(*) filter (where status = 'absent'),
                                             'late', count(*) filter (where status = 'late'), 'total', count(*))
                   from attendance where student_id = p_student and session = sch.current_session and term = sch.current_term),
    'fees', student_fees(p_student, sch.current_session, sch.current_term),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object('session', r.session, 'term', r.term, 'published', r.published,
                                          'average', case when r.published or staff then r.av end) order by r.session, r.term)
      from (select sc.session, sc.term, round(avg(sc.total),2) av,
                   bool_or(exists (select 1 from result_publications rp where rp.class_arm_id = sc.class_arm_id
                                   and rp.session = sc.session and rp.term = sc.term)) published
            from scores sc where sc.student_id = p_student and sc.total is not null group by sc.session, sc.term) r), '[]'),
    'block_results_if_owing', sch.block_results_if_owing
  );
end $$;
grant execute on function get_child_overview(uuid) to authenticated;

-- ---------- 10. Scratch-card PINs for checking results without an account ----------
create table if not exists result_pins (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  pin         text not null unique,
  serial      bigserial,
  session     text not null,
  term        smallint not null,
  student_id  uuid references students(id) on delete set null,
  uses        int not null default 0,
  max_uses    int not null default 5,
  created_at  timestamptz default now()
);
alter table result_pins enable row level security;
drop policy if exists "Admin reads pins" on result_pins;
create policy "Admin reads pins" on result_pins for select to authenticated using (school_id = my_school_id() and my_role() = 'admin');

create or replace function generate_result_pins(p_count int) returns int
language plpgsql security definer set search_path = public as $$
declare sch schools; i int := 0;
begin
  if my_role() is distinct from 'admin' then raise exception 'Only the school admin can create PINs'; end if;
  if p_count < 1 or p_count > 500 then raise exception 'Create between 1 and 500 PINs at a time'; end if;
  select * into sch from schools where id = my_school_id();
  while i < p_count loop
    begin
      insert into result_pins (school_id, pin, session, term)
      values (sch.id, lpad((floor(random() * 1e6))::bigint::text, 6, '0') || lpad((floor(random() * 1e6))::bigint::text, 6, '0'),
              sch.current_session, sch.current_term);
      i := i + 1;
    exception when unique_violation then null;
    end;
  end loop;
  return i;
end $$;
grant execute on function generate_result_pins(int) to authenticated;

-- Public: anyone with a valid PIN and admission number can view that published result
create or replace function check_result_by_pin(p_pin text, p_admission_no text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare rp result_pins; st students; sch schools; v_arm uuid; bal numeric;
begin
  select * into rp from result_pins where pin = regexp_replace(coalesce(p_pin,''), '\D', '', 'g');
  if not found then raise exception 'Invalid PIN. Check the number on your scratch card.'; end if;
  select * into sch from schools where id = rp.school_id;
  if sch.status <> 'active' then raise exception 'This school''s result service is unavailable.'; end if;
  select * into st from students where school_id = rp.school_id and upper(admission_no) = upper(trim(p_admission_no));
  if not found then raise exception 'No student with that admission number.'; end if;
  if rp.student_id is not null and rp.student_id <> st.id then raise exception 'This PIN has already been used for another student.'; end if;
  if rp.uses >= rp.max_uses then raise exception 'This PIN has reached its usage limit.'; end if;
  v_arm := coalesce((select class_arm_id from scores where student_id = st.id and session = rp.session and term = rp.term and class_arm_id is not null limit 1), st.class_arm_id);
  if not exists (select 1 from result_publications where class_arm_id = v_arm and session = rp.session and term = rp.term) then
    raise exception 'This result has not been released by the school yet. Your PIN has not been used.';
  end if;
  if sch.block_results_if_owing then
    bal := (student_fees(st.id, rp.session, rp.term) ->> 'balance')::numeric;
    if bal > 0 then raise exception 'This result is held until the school fees are paid. Your PIN has not been used.'; end if;
  end if;
  update result_pins set student_id = st.id, uses = uses + 1 where id = rp.id;
  return report_json_internal(st.id, rp.session, rp.term) || jsonb_build_object('pin_uses_left', rp.max_uses - rp.uses - 1);
end $$;
grant execute on function check_result_by_pin(text, text) to anon, authenticated;

-- ---------- 11. Platform overview: include new counts ----------
create or replace function platform_overview()
returns table (id uuid, name text, status text, created_at timestamptz, admin_name text,
               teachers bigint, parents bigint, students bigint, lesson_notes bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'Not allowed'; end if;
  return query
  select s.id, s.name, s.status, s.created_at,
         (select p.full_name from profiles p where p.school_id = s.id and p.role = 'admin' order by p.created_at limit 1),
         (select count(*) from profiles p where p.school_id = s.id and p.role in ('teacher','bursar')),
         (select count(*) from profiles p where p.school_id = s.id and p.role = 'parent'),
         (select count(*) from students st where st.school_id = s.id and st.status = 'active'),
         (select count(*) from lesson_notes n where n.school_id = s.id)
  from schools s order by s.created_at desc;
end $$;
