-- ============================================================================
-- MIGRATION-HISTORY REPAIR for project eapvwsikjqdizoncfntm.   *** WRITES ***
-- ============================================================================
-- DO NOT RUN until ALL of these are true (owner approval required):
--   1. docs/resume-builder-reconciliation-audit.sql: 0 DIFF / 0 MISSING / 0 EXTRA
--      (owner's run on 2026-11-23: 155 MATCH, 0 DIFF/MISSING/EXTRA).
--   2. docs/resume-builder-policy-check.sql: 11 rows, all MATCH.
--   3. A current backup / restore point is confirmed (Database -> Backups).
--
-- What it does: records five migrations whose effects were already applied by
-- hand, so `supabase db push` will not try to run them again. It executes NO
-- migration SQL and touches NO table other than supabase_migrations.schema_migrations.
-- Equivalent to: supabase migration repair --status applied <the five versions>
-- (the CLI login currently gets 403 on this project, hence the SQL Editor).
--
-- Safety: the guard block re-checks key objects and aborts (nothing written)
-- if any is missing. Re-running is harmless (ON CONFLICT DO NOTHING).
-- Undo, if ever needed: delete these five version rows (affects history only).
-- ============================================================================
begin;

do $$
declare
  missing text := '';
begin
  -- 20261120000001: tables, a key function, the private bucket
  if to_regclass('public.resumes') is null or to_regclass('public.resume_versions') is null
     or to_regclass('public.resume_pdf_jobs') is null or to_regclass('public.resume_ai_usage') is null then
    missing := missing || ' resume tables;';
  end if;
  if to_regprocedure('public.consume_resume_ai_quota(uuid,text,integer,integer)') is null then missing := missing || ' consume_resume_ai_quota;'; end if;
  if not exists (select 1 from storage.buckets where id = 'student-resumes' and public = false) then missing := missing || ' private student-resumes bucket;'; end if;
  -- 20261116000003: fixed has_permission (slug, not code)
  if not exists (select 1 from pg_proc where proname = 'has_permission' and pronamespace = 'public'::regnamespace and prosrc like '%p.slug%') then
    missing := missing || ' has_permission(slug);';
  end if;
  -- 20261117000001 / 000002
  if to_regprocedure('public.is_published_course_media_file(uuid)') is null then missing := missing || ' is_published_course_media_file;'; end if;
  if to_regprocedure('public.get_public_course_outline(uuid)') is null then missing := missing || ' get_public_course_outline;'; end if;
  -- 20261117000001 + 000003 policies (11)
  if (select count(*) from pg_policies where schemaname = 'public' and policyname in (
        'Anyone can view published course media files',
        'CRM readers view leads','CRM editors create leads','CRM editors update leads',
        'CRM readers view followups','CRM editors create followups','CRM editors update followups',
        'CRM readers view lead notes','CRM editors add lead notes',
        'CRM readers view lead activities','CRM editors log lead activities')) <> 11 then
    missing := missing || ' 11 policies;';
  end if;
  if missing <> '' then
    raise exception 'History repair aborted, objects missing:%', missing;
  end if;
end $$;

insert into supabase_migrations.schema_migrations (version, name) values
  ('20261116000003', 'restore_rbac_permission_functions'),
  ('20261117000001', 'files_public_read_published_course_media'),
  ('20261117000002', 'public_course_outline'),
  ('20261117000003', 'counsellor_crm_leads_rls'),
  ('20261120000001', 'resume_builder_multi_resume')
on conflict (version) do nothing;

-- Expect 5 rows back.
select version, name from supabase_migrations.schema_migrations
where version in ('20261116000003','20261117000001','20261117000002','20261117000003','20261120000001')
order by version;

commit;
