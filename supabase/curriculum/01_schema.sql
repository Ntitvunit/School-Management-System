-- =====================================================================
-- Curriculum module: database schema (PostgreSQL / Supabase)
-- Works with the rocket.new Supabase backend.
-- Covers Pre-Nursery to Primary 6 now; JSS 1 to SSS 3 use the same tables.
-- =====================================================================

-- 1. MASTER CURRICULUM (shared by every school on the platform) ----------

create table curricula (
  id              text primary key,           -- e.g. 'ng-scheme-2025-preprimary-primary'
  title           text not null,
  authority_note  text,                       -- NERDC / NAPPS alignment note
  term_structure  text,
  version_year    int default 2025,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

create table class_levels (
  code        text primary key,               -- PN, N1..N3, P1..P6, JSS1..JSS3, SS1..SS3
  name        text not null,                  -- 'Primary 4'
  level       text not null check (level in ('pre_primary','primary','jss','sss')),
  sort_order  int not null
);

create table subjects (
  id      text primary key,                   -- 'basic-science-and-technology'
  name    text not null,
  levels  text[] not null                     -- {'pre_primary','primary'}
);

-- which subjects each class takes in the master curriculum
create table curriculum_offerings (
  curriculum_id text references curricula(id),
  class_code    text references class_levels(code),
  subject_id    text references subjects(id),
  primary key (curriculum_id, class_code, subject_id)
);

-- one row = one week of one subject in one class and term
create table curriculum_topics (
  id                  text primary key,       -- 'P4-basic-science-and-technology-t1-w2'
  curriculum_id       text references curricula(id),
  class_code          text references class_levels(code),
  subject_id          text references subjects(id),
  term                smallint not null check (term between 1 and 3),
  week                text not null,          -- '2', or a range such as '11-13'
  week_start          smallint not null,
  week_type           text not null check (week_type in
                        ('teaching','midterm_assessment','midterm_break','revision','examination','closing')),
  theme               text,
  topic               text not null,
  subtopics           jsonb default '[]',     -- breakdown / content points
  objectives          jsonb default '[]',
  teacher_activities  jsonb default '[]',
  pupil_activities    jsonb default '[]',
  resources           jsonb default '[]',     -- instructional materials
  source_page         int                     -- page in the source PDF, for checking
);
create index on curriculum_topics (class_code, subject_id, term, week_start);

-- 2. DIGITAL RESOURCES AND VIRTUAL LABS (ready for embedding later) -----

create table resource_providers (
  id               text primary key,          -- 'labxchange', 'phet', 'youtube', 'school-upload'
  name             text not null,
  website          text,
  embed_permitted  boolean default false,     -- set to TRUE only after written permission
  agreement_note   text                       -- e.g. 'Email from LabXchange, 2026-11-02'
);

create table digital_resources (
  id            uuid primary key default gen_random_uuid(),
  provider_id   text references resource_providers(id),
  title         text not null,
  kind          text check (kind in ('simulation','virtual_lab','video','worksheet','lesson_plan','slides','other')),
  link_url      text not null,                -- always works: opens in a new tab
  embed_url     text,                         -- filled in later; used only if the provider allows embedding
  level         text,
  notes         text,
  added_by      uuid,                         -- teacher/admin user id
  is_approved   boolean default false,        -- HOD/admin approves before teachers see it
  created_at    timestamptz default now()
);

-- many-to-many: a simulation can serve several topics
create table topic_resources (
  topic_id     text references curriculum_topics(id) on delete cascade,
  resource_id  uuid references digital_resources(id) on delete cascade,
  primary key (topic_id, resource_id)
);
-- UI rule: show an embedded player only when
--   digital_resources.embed_url is not null AND resource_providers.embed_permitted = true;
-- otherwise show an "Open in LabXchange" button that uses link_url.

-- 3. SCHOOL-LEVEL CUSTOMISATION -----------------------------------------

-- each school switches on the classes/subjects it runs
create table school_subject_settings (
  school_id    uuid not null,
  class_code   text references class_levels(code),
  subject_id   text references subjects(id),
  enabled      boolean default true,
  local_name   text,                          -- e.g. 'Basic Science' shown as 'Science'
  primary key (school_id, class_code, subject_id)
);

-- a school may edit, reorder or add a week without changing the master copy
create table school_topic_overrides (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null,
  base_topic_id  text references curriculum_topics(id),   -- null = a topic the school added
  class_code     text references class_levels(code),
  subject_id     text references subjects(id),
  term           smallint,
  week_start     smallint,
  topic          text,
  subtopics      jsonb,
  hidden         boolean default false,
  updated_by     uuid,
  updated_at     timestamptz default now()
);

-- 4. TEACHING: LESSON NOTES AND COVERAGE --------------------------------

create table lesson_notes (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null,
  session       text not null,                -- '2026/2027'
  class_arm_id  uuid,                         -- e.g. Primary 4A
  topic_id      text references curriculum_topics(id),
  teacher_id    uuid not null,
  content       jsonb,                        -- pre-filled from the topic, then edited by the teacher
  status        text default 'draft' check (status in ('draft','submitted','approved','returned')),
  reviewer_id   uuid,
  review_comment text,
  submitted_at  timestamptz,
  approved_at   timestamptz
);

create table topic_coverage (
  school_id     uuid not null,
  session       text not null,
  class_arm_id  uuid not null,
  topic_id      text references curriculum_topics(id),
  teacher_id    uuid,
  status        text default 'not_started' check (status in ('not_started','in_progress','covered','skipped')),
  covered_on    date,
  remark        text,
  primary key (school_id, session, class_arm_id, topic_id)
);

-- coverage % per class arm, subject and term (feeds the admin dashboard)
create view coverage_summary as
select c.school_id, c.session, c.class_arm_id, t.subject_id, t.term,
       count(*) filter (where t.week_type = 'teaching')                              as planned_topics,
       count(*) filter (where t.week_type = 'teaching' and c.status = 'covered')     as covered_topics,
       round(100.0 * count(*) filter (where t.week_type = 'teaching' and c.status = 'covered')
             / nullif(count(*) filter (where t.week_type = 'teaching'), 0), 1)        as coverage_pct
from topic_coverage c
join curriculum_topics t on t.id = c.topic_id
group by 1, 2, 3, 4, 5;
