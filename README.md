# School Management System (prototype)

Scheme of work, lesson notes and curriculum coverage for Nigerian schools (Pre-Nursery to Primary 6; JSS and SSS to follow).
Built with Next.js and Supabase.

## What's in this version
- **Sign in / create account**, then **create a school** (you become admin) or **join a school** with its 6-character code (teachers and parents).
- **Scheme of work** (teachers, admin): class → subject → term, week by week from the 2025 scheme. Mark topics as covered. Virtual lab links on science topics.
- **Lesson notes**: one click creates a note pre-filled from the week's topic, objectives, activities and materials. Teachers save drafts and submit; the admin approves or returns with a comment.
- **Coverage** (admin): topics covered per subject against what is expected by the current week.
- **This week** (everyone, especially parents): what each class is learning this week.
- **School settings** (admin): school code, session, current term and week, class arms, list of people.

## Database setup (Supabase SQL Editor, in order)
1. `supabase/curriculum/01_schema.sql` … `06_data_part_5.sql` — curriculum tables and data (already done if the count of `curriculum_topics` is 3856).
2. `supabase/app_setup.sql` — schools, profiles, class arms and security rules. Run once.

## Deploy on Vercel
1. Sign in at vercel.com with GitHub → **Add New → Project** → import this repository.
2. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Connect
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — the publishable / anon key (never the secret or service_role key)
3. Click **Deploy**.
4. In Supabase → Authentication → URL Configuration, set **Site URL** to your Vercel address
   (or, for the prototype, turn off **Confirm email** under Authentication → Providers → Email).

## Run locally (optional)
```
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```
