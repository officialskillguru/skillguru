-- FUNCTIONAL BUG FIX: success_stories' INSERT/UPDATE/DELETE policies checked
-- `auth.jwt() ->> 'role' = 'admin'`. In Supabase, the JWT's top-level `role`
-- claim is the POSTGRES role used for RLS switching ("authenticated" or
-- "anon"), never an application role - it can never equal 'admin' for any
-- real user, including genuine platform admins. Confirmed live: a real
-- admin's INSERT was rejected with a real RLS violation
-- ("new row violates row-level security policy for table success_stories"),
-- and successStories.service.ts writes directly via the client (no Edge
-- Function/service-role bypass), so the entire Admin Success Stories create/
-- edit/delete/publish feature was non-functional in production. Fixed to use
-- the same has_role('admin') helper every other table in this schema uses
-- correctly.

drop policy if exists "consolidated_insert" on public.success_stories;
create policy "consolidated_insert" on public.success_stories
  for insert
  with check (public.has_role('admin'));

drop policy if exists "consolidated_update" on public.success_stories;
create policy "consolidated_update" on public.success_stories
  for update
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "consolidated_delete" on public.success_stories;
create policy "consolidated_delete" on public.success_stories
  for delete
  using (public.has_role('admin'));

drop policy if exists "consolidated_select" on public.success_stories;
create policy "consolidated_select" on public.success_stories
  for select
  using (public.has_role('admin') or published = true);
