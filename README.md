# School Management System

A school management system for Nigerian schools, customisable for Basic (Nursery, Primary, JSS) and Post-Basic (SSS).
Built with Next.js and Supabase; deployed on Vercel.

## Modules
- **School setup**: levels offered, session/term/week, next term date, theme and colours, motto, address,
  assessment columns (CA/exam weights), grading scale (e.g. A–F or WAEC A1–F9), subjects per class (switch off / add your own),
  class arms, option to hold results until fees are paid.
- **Staff and roles**: admin, teacher, bursar; class teachers; subject teachers.
- **Students**: admission, guardian details, medical notes, stream, status; parent account links; fees and results on each profile.
- **Academics and results**: score entry with live totals and grades, broadsheet with averages and positions, comments and
  affective/psychomotor ratings, printable report cards, publish/unpublish per class, **score change log**.
- **Attendance**: daily register per class; term totals flow into report cards.
- **Finance (bursary)**: fee structure per class and term, payments with receipts, discounts, debtors list, collection progress.
- **Curriculum**: scheme of work (Pre-Nursery to Primary 6), lesson notes with review, coverage report, virtual lab links.
- **Parent portal**: each child's results, attendance, fees and payments, this week's topics, announcements, alert when average drops.
- **Student portal**: students join with admission number (and date of birth) and see their own results and attendance.
- **Scratch-card PINs**: public `/check-result` page; each PIN works for one student, up to 5 times, only after results are published.
- **Announcements** to everyone, staff, parents or students.
- **Platform owner** area: all schools with counts; suspend or reactivate a school.

## Database setup (Supabase SQL Editor, in order, each once)
1. `supabase/curriculum/01_schema.sql` … `06_data_part_5.sql`
2. `supabase/app_setup.sql`
3. `supabase/upgrade_02_students_themes_platform.sql`
4. `supabase/upgrade_03_full_programme.sql`
5. Platform owner: `insert into platform_admins (user_id) select id from auth.users where email = 'YOUR-LOGIN-EMAIL' on conflict do nothing;`

## Deploy
Vercel builds automatically from GitHub. The Supabase URL and publishable key are public values and are set in
`lib/supabase/env.ts` (Vercel environment variables override them).

## Planned
Online fee payment (Paystack/Flutterwave), SMS/WhatsApp alerts, CBT, timetable, offline score entry, JSS–SSS scheme of work.
