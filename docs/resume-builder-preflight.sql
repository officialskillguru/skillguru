-- AI Resume Builder: production PRE-FLIGHT (READ-ONLY).
-- Paste the whole file into Supabase Dashboard -> SQL Editor -> Run.
-- Every statement is a SELECT. Nothing is created, changed or deleted.
-- Before running, confirm the dashboard URL contains the project ref the live
-- site uses: eapvwsikjqdizoncfntm (verified from the public bundle on 2026-11-23).

-- Q1. Do the four Resume Builder tables exist yet? (expected before migration: all false)
select t.name,
       to_regclass('public.' || t.name) is not null as exists
from (values ('resumes'),('resume_versions'),('resume_pdf_jobs'),('resume_ai_usage')) t(name);

-- Q2. Is 20261120000001 recorded in the migration history? (expected: 0 rows)
select version, name from supabase_migrations.schema_migrations
where version = '20261120000001';

-- Q3. Repo migrations NOT recorded on live (generated from supabase/migrations, 89 files).
--     Expected: exactly one row, 20261120000001. Any other rows = live lags the repo;
--     STOP and report them before applying anything.
select r.version as missing_on_live
from (values ('001'),('002'),('003'),('004'),('005'),('006'),('20260706000004'),('20260706000005'),('20260706000007'),('20260706000008'),('20260706000009'),('20260706000010'),('20260706000011'),('20260718000001'),('20260718000002'),('20260718000003'),('20260718000004'),('20260718000005'),('20260718000006'),('20260718000007'),('20260718000008'),('20260718000009'),('20260718000010'),('20260718074318'),('20260725000001'),('20260725000002'),('20260726000001'),('20260727000001'),('20260727000002'),('20260727000003'),('20260727000004'),('20260727000005'),('20260727000006'),('20260727073017'),('20260727073511'),('20260727080000'),('20260727080500'),('20260727090000'),('20260729000001'),('20260729000002'),('20260729000003'),('20260729000004'),('20260729000005'),('20260729000006'),('20260729000007'),('20260729000008'),('20260729000009'),('20260729000010'),('20260729000011'),('20260729000012'),('20260729000013'),('20260729000014'),('20260801000001'),('20260801000002'),('20260801000003'),('20260805000001'),('20260806000001'),('20260806000002'),('20260807000001'),('20260808000001'),('20260809000001'),('20260812000001'),('20260813000001'),('20260829070000'),('20260901000001'),('20260902110001'),('20260902110002'),('20260902110003'),('20260902110004'),('20260902110005'),('20260902110006'),('20260902110007'),('20260902110008'),('20260902110009'),('20260902110010'),('20260902130001'),('20260902130002'),('20260904000001'),('20260904010001'),('20260904020001'),('20260904030001'),('20260905000001'),('20261116000001'),('20261116000002'),('20261116000003'),('20261117000001'),('20261117000002'),('20261117000003'),('20261120000001')) r(version)
left join supabase_migrations.schema_migrations m on m.version = r.version
where m.version is null
order by r.version;

-- Q4. Live migrations that are NOT in the repo (drift the other way). Expected: 0 rows.
select m.version, m.name from supabase_migrations.schema_migrations m
where m.version not in (select v from (values ('001'),('002'),('003'),('004'),('005'),('006'),('20260706000004'),('20260706000005'),('20260706000007'),('20260706000008'),('20260706000009'),('20260706000010'),('20260706000011'),('20260718000001'),('20260718000002'),('20260718000003'),('20260718000004'),('20260718000005'),('20260718000006'),('20260718000007'),('20260718000008'),('20260718000009'),('20260718000010'),('20260718074318'),('20260725000001'),('20260725000002'),('20260726000001'),('20260727000001'),('20260727000002'),('20260727000003'),('20260727000004'),('20260727000005'),('20260727000006'),('20260727073017'),('20260727073511'),('20260727080000'),('20260727080500'),('20260727090000'),('20260729000001'),('20260729000002'),('20260729000003'),('20260729000004'),('20260729000005'),('20260729000006'),('20260729000007'),('20260729000008'),('20260729000009'),('20260729000010'),('20260729000011'),('20260729000012'),('20260729000013'),('20260729000014'),('20260801000001'),('20260801000002'),('20260801000003'),('20260805000001'),('20260806000001'),('20260806000002'),('20260807000001'),('20260808000001'),('20260809000001'),('20260812000001'),('20260813000001'),('20260829070000'),('20260901000001'),('20260902110001'),('20260902110002'),('20260902110003'),('20260902110004'),('20260902110005'),('20260902110006'),('20260902110007'),('20260902110008'),('20260902110009'),('20260902110010'),('20260902130001'),('20260902130002'),('20260904000001'),('20260904010001'),('20260904020001'),('20260904030001'),('20260905000001'),('20261116000001'),('20261116000002'),('20261116000003'),('20261117000001'),('20261117000002'),('20261117000003'),('20261120000001')) r(v))
order by m.version;

-- Q5. Predecessors. The migration itself only references public.profiles and auth.*
--     (its helper functions are created inside it). Expected: profiles not null. The other
--     two columns are informational (the classic resume page uses them).
select to_regclass('public.profiles') as profiles,
       to_regclass('public.student_profiles') as student_profiles,
       to_regclass('public.resume_experience') as classic_resume_experience;

-- Q6. Name collisions with objects the migration creates. Expected: 0 rows each.
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('get_my_resume_stats','duplicate_resume','create_resume_version',
  'restore_resume_version','prune_resume_versions','resume_version_retention','consume_resume_ai_quota',
  'resumes_before_write','resumes_enforce_limit');
select id, public from storage.buckets where id = 'student-resumes';
select policyname from pg_policies where schemaname = 'storage' and policyname like 'student_resumes_%';

-- Q7. Baseline row counts of existing student data. SAVE THIS OUTPUT; re-run after migration,
--     the numbers must be identical.
select (select count(*) from public.profiles)          as profiles,
       (select count(*) from public.student_profiles)  as student_profiles,
       (select count(*) from public.resume_experience) as resume_experience,
       (select count(*) from auth.users)               as auth_users;
