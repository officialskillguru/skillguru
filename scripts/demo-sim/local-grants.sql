-- LOCAL SIMULATION STACK ONLY (applied by scripts/demo-sim/seed.mjs to 127.0.0.1).
--
-- The hosted SkillGuru project was created when Supabase still auto-granted
-- table privileges to anon/authenticated/service_role on every new table; RLS
-- policies are the actual access boundary there. Recent Supabase CLI images no
-- longer do that, so a freshly migrated local stack has RLS policies but no
-- table grants and every Data API call fails with "permission denied".
--
-- This restores the hosted project's legacy grants for tables that have none.
-- Tables whose migration manages grants explicitly (the Resume Builder tables)
-- are left exactly as their migration defines them. Never run this against a
-- hosted project.
do $$
declare
  t record;
begin
  for t in
    select c.oid, c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
       and c.relname not in ('resumes', 'resume_versions', 'resume_pdf_jobs', 'resume_ai_usage')
  loop
    if not has_table_privilege('service_role', t.oid, 'select') then
      execute format('grant all on table public.%I to service_role', t.relname);
    end if;
    if not has_table_privilege('authenticated', t.oid, 'select') then
      execute format('grant all on table public.%I to authenticated', t.relname);
    end if;
    if not has_table_privilege('anon', t.oid, 'select') then
      execute format('grant all on table public.%I to anon', t.relname);
    end if;
  end loop;
end $$;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant all on table public.resumes, public.resume_versions, public.resume_pdf_jobs, public.resume_ai_usage to service_role;
