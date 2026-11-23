-- AI Resume Builder pre-flight Q1-Q6 (READ-ONLY: a single SELECT, nothing is changed).
-- Run in the SQL Editor of project eapvwsikjqdizoncfntm. Returns one labelled row per check.
with repo(version) as (values ('001'),('002'),('003'),('004'),('005'),('006'),('20260706000004'),('20260706000005'),('20260706000007'),('20260706000008'),('20260706000009'),('20260706000010'),('20260706000011'),('20260718000001'),('20260718000002'),('20260718000003'),('20260718000004'),('20260718000005'),('20260718000006'),('20260718000007'),('20260718000008'),('20260718000009'),('20260718000010'),('20260718074318'),('20260725000001'),('20260725000002'),('20260726000001'),('20260727000001'),('20260727000002'),('20260727000003'),('20260727000004'),('20260727000005'),('20260727000006'),('20260727073017'),('20260727073511'),('20260727080000'),('20260727080500'),('20260727090000'),('20260729000001'),('20260729000002'),('20260729000003'),('20260729000004'),('20260729000005'),('20260729000006'),('20260729000007'),('20260729000008'),('20260729000009'),('20260729000010'),('20260729000011'),('20260729000012'),('20260729000013'),('20260729000014'),('20260801000001'),('20260801000002'),('20260801000003'),('20260805000001'),('20260806000001'),('20260806000002'),('20260807000001'),('20260808000001'),('20260809000001'),('20260812000001'),('20260813000001'),('20260829070000'),('20260901000001'),('20260902110001'),('20260902110002'),('20260902110003'),('20260902110004'),('20260902110005'),('20260902110006'),('20260902110007'),('20260902110008'),('20260902110009'),('20260902110010'),('20260902130001'),('20260902130002'),('20260904000001'),('20260904010001'),('20260904020001'),('20260904030001'),('20260905000001'),('20261116000001'),('20261116000002'),('20261116000003'),('20261117000001'),('20261117000002'),('20261117000003'),('20261120000001'))
-- Q1. Resume Builder tables/views already present? (expected: false x4)
select 'Q1 table exists' as check, t.name as item, (to_regclass('public.' || t.name) is not null)::text as result
from (values ('resumes'),('resume_versions'),('resume_pdf_jobs'),('resume_ai_usage')) t(name)
union all
-- Q2. Is 20261120000001 recorded in migration history? (expected: false)
select 'Q2 20261120000001 recorded', '', exists(select 1 from supabase_migrations.schema_migrations where version = '20261120000001')::text
union all
-- Q3. Repo migrations missing from live history (expected: count 1, only 20261120000001)
select 'Q3 missing on live (count)', '', count(*)::text from repo r
  where not exists (select 1 from supabase_migrations.schema_migrations m where m.version = r.version)
union all
select 'Q3 missing on live', r.version, '' from repo r
  where not exists (select 1 from supabase_migrations.schema_migrations m where m.version = r.version)
union all
-- Q4. Live history entries not in the repo (expected: count 0)
select 'Q4 on live, not in repo (count)', '', count(*)::text from supabase_migrations.schema_migrations m
  where m.version not in (select version from repo)
union all
select 'Q4 on live, not in repo', m.version, coalesce(m.name, '') from supabase_migrations.schema_migrations m
  where m.version not in (select version from repo)
union all
-- Q5. Predecessors (expected: profiles true; the other two informational)
select 'Q5 predecessor exists', t.name, (to_regclass('public.' || t.name) is not null)::text
from (values ('profiles'),('student_profiles'),('resume_experience')) t(name)
union all
-- Q6. Name collisions with objects the migration creates (expected: no Q6 rows except the count, which should be 0)
select 'Q6 collisions (count)', '', (
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
      ('get_my_resume_stats','duplicate_resume','create_resume_version','restore_resume_version','prune_resume_versions',
       'resume_version_retention','consume_resume_ai_quota','resumes_before_write','resumes_enforce_limit'))
  + (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in
      ('idx_resume_ai_usage_user_time','idx_resume_pdf_jobs_resume','idx_resume_versions_resume','idx_resumes_user_updated','uq_resume_pdf_jobs_one_active'))
  + (select count(*) from pg_type ty join pg_namespace n on n.oid = ty.typnamespace where n.nspname = 'public' and ty.typtype <> 'c' and ty.typname in
      ('resumes','resume_versions','resume_pdf_jobs','resume_ai_usage'))
  + (select count(*) from storage.buckets where id = 'student-resumes')
  + (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'student_resumes_%')
  + (select count(*) from pg_trigger where not tgisinternal and tgname in ('resumes_before_write','resumes_enforce_limit'))
)::text
union all
select 'Q6 function collision', p.proname, pg_get_function_identity_arguments(p.oid) || ' -> ' || pg_get_function_result(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
  ('get_my_resume_stats','duplicate_resume','create_resume_version','restore_resume_version','prune_resume_versions',
   'resume_version_retention','consume_resume_ai_quota','resumes_before_write','resumes_enforce_limit')
union all
select 'Q6 index collision', c.relname, 'on ' || coalesce((select ci.relname from pg_index i join pg_class ci on ci.oid = i.indrelid where i.indexrelid = c.oid), '?')
from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in
  ('idx_resume_ai_usage_user_time','idx_resume_pdf_jobs_resume','idx_resume_versions_resume','idx_resumes_user_updated','uq_resume_pdf_jobs_one_active')
union all
select 'Q6 type collision', ty.typname, ty.typtype::text
from pg_type ty join pg_namespace n on n.oid = ty.typnamespace where n.nspname = 'public' and ty.typtype <> 'c' and ty.typname in
  ('resumes','resume_versions','resume_pdf_jobs','resume_ai_usage')
union all
select 'Q6 bucket exists', b.id, 'public=' || b.public::text from storage.buckets b where b.id = 'student-resumes'
union all
select 'Q6 storage policy exists', pol.policyname, pol.cmd from pg_policies pol where pol.schemaname = 'storage' and pol.policyname like 'student_resumes_%'
union all
select 'Q6 trigger name exists', tg.tgname, tg.tgrelid::regclass::text from pg_trigger tg where not tg.tgisinternal and tg.tgname in ('resumes_before_write','resumes_enforce_limit');
