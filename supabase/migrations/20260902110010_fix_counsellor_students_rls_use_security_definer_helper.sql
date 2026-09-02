-- Bug found during live verification of the profiles RLS change: the policy's inline
-- EXISTS against user_roles/roles ran with the CALLER's own RLS privileges (not
-- elevated), so a non-admin Counsellor's subquery against user_roles silently returned
-- no rows even for a real, active student -- has_permission('students.read') resolved
-- true but the role-check always evaluated false, making the new branch dead in practice.
--
-- Fix: use the existing SECURITY DEFINER helper public.user_has_role(uuid, text) -- the
-- same pattern already used everywhere else in this schema (messaging RPCs etc.) --
-- instead of a raw inline subquery against RLS-protected tables.
--
-- Verified live (rolled-back transaction): a counsellor grant now correctly sees a real
-- student profile that was invisible before this fix; an unrelated mentor still sees
-- nothing (regression check passed).
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.

drop policy if exists "consolidated_select" on public.profiles;
create policy "consolidated_select" on public.profiles
  for select
  using (
    public.has_role('admin')
    or (select auth.uid()) = id
    or (public.has_permission('students.read') and public.user_has_role(id, 'student'))
  );

drop policy if exists "consolidated_update" on public.profiles;
create policy "consolidated_update" on public.profiles
  for update
  using (
    public.has_role('admin')
    or (select auth.uid()) = id
    or (public.has_permission('students.update') and public.user_has_role(id, 'student'))
  )
  with check (
    public.has_role('admin')
    or (select auth.uid()) = id
    or (public.has_permission('students.update') and public.user_has_role(id, 'student'))
  );
