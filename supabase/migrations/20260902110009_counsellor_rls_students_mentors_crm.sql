-- Phase 4/8 groundwork: wire the students.read/students.update, mentors.update, and
-- crm.read/crm.update permissions (granted to Counsellor in Phase 1) into the tables
-- they're meant to govern. Additive OR-branches only -- admin and self-access keep
-- working exactly as before.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.
-- NOTE: superseded immediately by 20260902110010_fix_counsellor_students_rls_use_security_definer_helper.sql
-- for the profiles policies -- see that file's header for the bug found and fixed.

-- mentor_profiles: Counsellor can update mentor profiles (read is already open to any
-- authenticated user for non-deleted profiles, so mentors.read needs no RLS change).
drop policy if exists "consolidated_update" on public.mentor_profiles;
create policy "consolidated_update" on public.mentor_profiles
  for update
  using (
    public.has_role('admin')
    or (select auth.uid()) = id
    or public.has_permission('mentors.update')
  )
  with check (
    public.has_role('admin')
    or (select auth.uid()) = id
    or public.has_permission('mentors.update')
  );

-- mentor_notes (CRM): split the single admin-only ALL policy into per-command policies
-- so crm.read (Counsellor) grants SELECT and crm.update grants INSERT/UPDATE/DELETE,
-- without weakening admin's existing full access.
drop policy if exists "Admins manage mentor notes" on public.mentor_notes;

create policy "mentor_notes_select" on public.mentor_notes
  for select
  using (public.has_role('admin') or public.has_permission('crm.read'));

create policy "mentor_notes_insert" on public.mentor_notes
  for insert
  with check (public.has_role('admin') or public.has_permission('crm.update'));

create policy "mentor_notes_update" on public.mentor_notes
  for update
  using (public.has_role('admin') or public.has_permission('crm.update'))
  with check (public.has_role('admin') or public.has_permission('crm.update'));

create policy "mentor_notes_delete" on public.mentor_notes
  for delete
  using (public.has_role('admin') or public.has_permission('crm.update'));
