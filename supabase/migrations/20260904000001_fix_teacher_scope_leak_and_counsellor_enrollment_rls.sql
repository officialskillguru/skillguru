-- SECURITY FIX: two real RLS defects found during a full application audit.
--
-- (1) assignments / attendance / assignment_submissions each carried a bare
--     `has_role('mentor')` clause with no course scoping, letting ANY teacher
--     read/write assignments, attendance, and grades/feedback for EVERY course
--     platform-wide, not just courses they are actually assigned to via
--     course_mentors/courses.mentor_id. This directly violated the "teacher
--     can only see/manage their assigned courses" business rule. Fixed by
--     replacing the blanket role check with public.is_course_mentor(course_id)
--     (the same helper already used correctly for courses/quizzes/enrollments).
--
-- (2) enrollments INSERT/UPDATE/DELETE only checked has_role('admin'). The
--     Counsellor role already holds a `students.assign` permission (granted
--     in an earlier migration) that was never actually wired into these
--     policies, so Counsellors had no way to enrol or remove a student from
--     a course despite the product requiring it. Fixed by adding
--     has_permission('students.assign') alongside admin.
--
-- Applied directly to production via mcp__supabase__apply_migration.

-- ── assignments ──────────────────────────────────────────────────────────
drop policy if exists "consolidated_select" on public.assignments;
create policy "consolidated_select" on public.assignments
  for select
  using (
    public.has_role('admin')
    or public.is_course_mentor(course_id)
    or (course_id in (
      select e.course_id from public.enrollments e
      where e.student_id = auth.uid() and e.status = 'active'
    ))
  );

drop policy if exists "consolidated_insert" on public.assignments;
create policy "consolidated_insert" on public.assignments
  for insert
  with check (public.has_role('admin') or public.is_course_mentor(course_id));

drop policy if exists "consolidated_update" on public.assignments;
create policy "consolidated_update" on public.assignments
  for update
  using (public.has_role('admin') or public.is_course_mentor(course_id))
  with check (public.has_role('admin') or public.is_course_mentor(course_id));

drop policy if exists "consolidated_delete" on public.assignments;
create policy "consolidated_delete" on public.assignments
  for delete
  using (public.has_role('admin') or public.is_course_mentor(course_id));

-- ── attendance ───────────────────────────────────────────────────────────
drop policy if exists "consolidated_select" on public.attendance;
create policy "consolidated_select" on public.attendance
  for select
  using (
    public.has_role('admin')
    or public.is_course_mentor(course_id)
    or student_id = auth.uid()
  );

drop policy if exists "consolidated_insert" on public.attendance;
create policy "consolidated_insert" on public.attendance
  for insert
  with check (public.has_role('admin') or public.is_course_mentor(course_id));

drop policy if exists "consolidated_update" on public.attendance;
create policy "consolidated_update" on public.attendance
  for update
  using (public.has_role('admin') or public.is_course_mentor(course_id))
  with check (public.has_role('admin') or public.is_course_mentor(course_id));

drop policy if exists "consolidated_delete" on public.attendance;
create policy "consolidated_delete" on public.attendance
  for delete
  using (public.has_role('admin') or public.is_course_mentor(course_id));

-- ── assignment_submissions ───────────────────────────────────────────────
-- No course_id column directly; scope through the parent assignment.
drop policy if exists "consolidated_select" on public.assignment_submissions;
create policy "consolidated_select" on public.assignment_submissions
  for select
  using (
    student_id = auth.uid()
    or public.has_role('admin')
    or assignment_id in (
      select a.id from public.assignments a where public.is_course_mentor(a.course_id)
    )
  );

drop policy if exists "consolidated_insert" on public.assignment_submissions;
create policy "consolidated_insert" on public.assignment_submissions
  for insert
  with check (student_id = auth.uid() or public.has_role('admin'));

drop policy if exists "consolidated_update" on public.assignment_submissions;
create policy "consolidated_update" on public.assignment_submissions
  for update
  using (
    student_id = auth.uid()
    or public.has_role('admin')
    or assignment_id in (
      select a.id from public.assignments a where public.is_course_mentor(a.course_id)
    )
  )
  with check (
    student_id = auth.uid()
    or public.has_role('admin')
    or assignment_id in (
      select a.id from public.assignments a where public.is_course_mentor(a.course_id)
    )
  );

drop policy if exists "consolidated_delete" on public.assignment_submissions;
create policy "consolidated_delete" on public.assignment_submissions
  for delete
  using (student_id = auth.uid() or public.has_role('admin'));

-- ── enrollments: wire the existing students.assign permission into writes ──
drop policy if exists "consolidated_insert" on public.enrollments;
create policy "consolidated_insert" on public.enrollments
  for insert
  with check (public.has_role('admin') or public.has_permission('students.assign'));

drop policy if exists "consolidated_update" on public.enrollments;
create policy "consolidated_update" on public.enrollments
  for update
  using (
    public.has_role('admin')
    or public.has_permission('students.assign')
    or student_id = auth.uid()
  );

drop policy if exists "consolidated_delete" on public.enrollments;
create policy "consolidated_delete" on public.enrollments
  for delete
  using (public.has_role('admin') or public.has_permission('students.assign'));
