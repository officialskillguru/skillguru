-- SECURITY FIX: found via a systematic grep of every RLS policy referencing
-- 'mentor'/'student'/'counsellor' for the same bare has_role('mentor') pattern
-- already fixed once on assignments/attendance/live_classes. Several more
-- tables had it:
--
-- (1) live_sessions - a pre-existing, DEAD table (grep confirms zero app code
--     references it - only the generated types file). Dead in the frontend
--     does not mean safe: it's still reachable via the Supabase REST API by
--     any authenticated user with the "mentor" role, so its RLS is still a
--     real exposure. Scoped like assignments/attendance (is_course_mentor()).
--
-- (2) pipelines / pipeline_stages / pipeline_items / lead_activities - the
--     real, actively-used CRM lead pipeline (crm.service.ts). Confirmed
--     genuinely exploitable: ANY teacher account could read the ENTIRE sales
--     pipeline for every lead platform-wide, and pipeline_items' policy was
--     `cmd: ALL`, meaning any teacher could also move/delete/insert pipeline
--     items for leads that were never assigned to them. The `leads` table
--     itself already had the CORRECT scoping model
--     (assigned_mentor_id = auth.uid()) - these four tables just never
--     matched it. Fixed to mirror that pattern: a mentor sees pipeline_items/
--     lead_activities only for leads assigned to them; pipelines/
--     pipeline_stages (pure taxonomy, no lead PII) stay readable by any
--     mentor so the CRM board can render stage names, matching how the app
--     already queries them together in one embedded select.
--
-- (3) support_tickets / ticket_messages - blanket has_role('mentor') let any
--     teacher read/message on every student's support ticket, when the table
--     already has an `assigned_to` column that was never actually used by
--     the policy. Fixed to check assigned_to = auth.uid() instead of a bare
--     role check.
--
-- (4) user_statistics - blanket has_role('mentor') let any teacher read any
--     other user's aggregate stats row. Tightened to self + admin only.

-- ── live_sessions ────────────────────────────────────────────────────────
drop policy if exists "consolidated_select" on public.live_sessions;
create policy "consolidated_select" on public.live_sessions
  for select
  using (
    public.has_role('admin')
    or public.is_course_mentor(course_id)
    or (course_id in (
      select e.course_id from public.enrollments e
      where e.student_id = auth.uid() and e.status = 'active'
    ))
  );

-- ── lead_activities ──────────────────────────────────────────────────────
drop policy if exists "consolidated_select" on public.lead_activities;
create policy "consolidated_select" on public.lead_activities
  for select
  using (
    public.has_role('admin')
    or lead_id in (select l.id from public.leads l where l.assigned_mentor_id = auth.uid())
  );

-- ── pipelines / pipeline_stages (taxonomy only, no lead PII) ────────────────
drop policy if exists "consolidated_select" on public.pipelines;
create policy "consolidated_select" on public.pipelines
  for select
  using (public.has_role('admin') or public.has_role('mentor') or public.has_role('counsellor'));

drop policy if exists "consolidated_select" on public.pipeline_stages;
create policy "consolidated_select" on public.pipeline_stages
  for select
  using (public.has_role('admin') or public.has_role('mentor') or public.has_role('counsellor'));

-- ── pipeline_items (was cmd ALL, granting write access too) ────────────────
drop policy if exists "consolidated_all" on public.pipeline_items;

create policy "consolidated_select" on public.pipeline_items
  for select
  using (
    public.has_role('admin')
    or lead_id in (select l.id from public.leads l where l.assigned_mentor_id = auth.uid())
  );

create policy "consolidated_insert" on public.pipeline_items
  for insert
  with check (
    public.has_role('admin')
    or lead_id in (select l.id from public.leads l where l.assigned_mentor_id = auth.uid())
  );

create policy "consolidated_update" on public.pipeline_items
  for update
  using (
    public.has_role('admin')
    or lead_id in (select l.id from public.leads l where l.assigned_mentor_id = auth.uid())
  )
  with check (
    public.has_role('admin')
    or lead_id in (select l.id from public.leads l where l.assigned_mentor_id = auth.uid())
  );

create policy "consolidated_delete" on public.pipeline_items
  for delete
  using (public.has_role('admin'));

-- ── support_tickets / ticket_messages ────────────────────────────────────
drop policy if exists "consolidated_select" on public.support_tickets;
create policy "consolidated_select" on public.support_tickets
  for select
  using (
    public.has_role('admin')
    or student_id = auth.uid()
    or assigned_to = auth.uid()
  );

drop policy if exists "Ticket participants view messages" on public.ticket_messages;
create policy "Ticket participants view messages" on public.ticket_messages
  for select
  using (
    author_id = auth.uid()
    or public.has_role('admin')
    or ticket_id in (
      select t.id from public.support_tickets t
      where t.student_id = auth.uid() or t.assigned_to = auth.uid()
    )
  );

drop policy if exists "Ticket participants insert messages" on public.ticket_messages;
create policy "Ticket participants insert messages" on public.ticket_messages
  for insert
  with check (
    author_id = auth.uid()
    and (
      public.has_role('admin')
      or ticket_id in (
        select t.id from public.support_tickets t
        where t.student_id = auth.uid() or t.assigned_to = auth.uid()
      )
    )
  );

-- ── user_statistics ──────────────────────────────────────────────────────
drop policy if exists "Users view own statistics" on public.user_statistics;
create policy "Users view own statistics" on public.user_statistics
  for select
  using (user_id = auth.uid() or public.has_role('admin') or public.has_role('super_admin'));
