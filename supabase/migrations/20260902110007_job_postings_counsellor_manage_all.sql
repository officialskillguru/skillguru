-- Phase 8: grant Counsellor full CRUD on job_postings via the jobs.manage_all
-- permission seeded in Phase 1. Mentor's existing manage_own (create/edit own draft,
-- publish still admin-gated by the existing trigger) is untouched.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.

drop policy if exists "job_postings_select" on public.job_postings;
create policy "job_postings_select" on public.job_postings
  for select
  using (
    (status = 'open' and deleted_at is null)
    or public.has_role('admin')
    or public.has_permission('jobs.manage_all')
    or created_by = auth.uid()
  );

drop policy if exists "job_postings_insert" on public.job_postings;
create policy "job_postings_insert" on public.job_postings
  for insert
  with check (
    public.has_role('admin')
    or public.has_permission('jobs.manage_all')
    or (public.has_permission('jobs.manage_own') and created_by = auth.uid())
  );

drop policy if exists "job_postings_update" on public.job_postings;
create policy "job_postings_update" on public.job_postings
  for update
  using (
    public.has_role('admin')
    or public.has_permission('jobs.manage_all')
    or (public.has_permission('jobs.manage_own') and created_by = auth.uid())
  )
  with check (
    public.has_role('admin')
    or public.has_permission('jobs.manage_all')
    or (public.has_permission('jobs.manage_own') and created_by = auth.uid())
  );

drop policy if exists "job_postings_delete" on public.job_postings;
create policy "job_postings_delete" on public.job_postings
  for delete
  using (public.has_role('admin') or public.has_permission('jobs.manage_all'));
