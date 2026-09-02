-- Phase 3 (cont.): propagate the many-to-many course_mentors relationship into every
-- RLS policy that previously assumed a single owning mentor via courses.mentor_id.
-- Additive: courses.mentor_id keeps working (primary/legacy mentor still passes), and any
-- ADDITIONAL active course_mentors row now also passes. Nothing that worked before stops working.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.
-- Verified live: (1) a secondary mentor with only a course_mentors row now sees the course,
-- (2) an unrelated mentor still sees nothing for a draft course they're not assigned to,
-- (3) the original legacy primary mentor still sees their own draft course unchanged.
-- All verification ran inside rolled-back transactions; no data was left behind.

create or replace function public.is_course_mentor(p_course_id uuid)
returns boolean
language sql
security definer
stable
set search_path to 'public', 'pg_temp'
as $$
  select
    exists (
      select 1 from public.courses c
      where c.id = p_course_id and c.mentor_id = auth.uid()
    )
    or exists (
      select 1 from public.course_mentors cm
      where cm.course_id = p_course_id and cm.mentor_id = auth.uid() and cm.status = 'active'
    );
$$;

comment on function public.is_course_mentor(uuid) is
  'True if auth.uid() is the legacy primary mentor OR an active course_mentors assignee for the course. Central check so multi-mentor RLS stays in one place.';

-- courses
drop policy if exists "consolidated_select" on public.courses;
create policy "consolidated_select" on public.courses
  for select
  using (
    public.has_role('admin')
    or (public.is_course_mentor(id) and deleted_at is null)
    or (status = 'published' and deleted_at is null)
  );

drop policy if exists "consolidated_update" on public.courses;
create policy "consolidated_update" on public.courses
  for update
  using (
    public.has_permission('courses.update_all')
    or (public.has_permission('courses.update_own') and public.is_course_mentor(id) and deleted_at is null)
  )
  with check (
    public.has_permission('courses.update_all')
    or (public.has_permission('courses.update_own') and public.is_course_mentor(id))
  );

-- quizzes
drop policy if exists "consolidated_select" on public.quizzes;
create policy "consolidated_select" on public.quizzes
  for select
  using (
    public.has_role('admin')
    or public.is_course_mentor(course_id)
    or (is_published = true and public.has_active_enrollment(course_id))
  );

drop policy if exists "consolidated_insert" on public.quizzes;
create policy "consolidated_insert" on public.quizzes
  for insert
  with check (public.has_role('admin') or public.is_course_mentor(course_id));

drop policy if exists "consolidated_update" on public.quizzes;
create policy "consolidated_update" on public.quizzes
  for update
  using (public.has_role('admin') or public.is_course_mentor(course_id));

drop policy if exists "consolidated_delete" on public.quizzes;
create policy "consolidated_delete" on public.quizzes
  for delete
  using (public.has_role('admin') or public.is_course_mentor(course_id));

-- quiz_questions
drop policy if exists "consolidated_select" on public.quiz_questions;
create policy "consolidated_select" on public.quiz_questions
  for select
  using (
    public.has_role('admin')
    or quiz_id in (select q.id from public.quizzes q where public.is_course_mentor(q.course_id))
    or quiz_id in (select q.id from public.quizzes q where q.is_published = true and public.has_active_enrollment(q.course_id))
  );

drop policy if exists "consolidated_insert" on public.quiz_questions;
create policy "consolidated_insert" on public.quiz_questions
  for insert
  with check (
    public.has_role('admin')
    or quiz_id in (select q.id from public.quizzes q where public.is_course_mentor(q.course_id))
  );

drop policy if exists "consolidated_update" on public.quiz_questions;
create policy "consolidated_update" on public.quiz_questions
  for update
  using (
    public.has_role('admin')
    or quiz_id in (select q.id from public.quizzes q where public.is_course_mentor(q.course_id))
  );

drop policy if exists "consolidated_delete" on public.quiz_questions;
create policy "consolidated_delete" on public.quiz_questions
  for delete
  using (
    public.has_role('admin')
    or quiz_id in (select q.id from public.quizzes q where public.is_course_mentor(q.course_id))
  );

-- quiz_options
drop policy if exists "consolidated_select" on public.quiz_options;
create policy "consolidated_select" on public.quiz_options
  for select
  using (
    public.has_role('admin')
    or question_id in (
      select qq.id from public.quiz_questions qq join public.quizzes qz on qz.id = qq.quiz_id
      where public.is_course_mentor(qz.course_id)
    )
    or question_id in (
      select qq.id from public.quiz_questions qq join public.quizzes qz on qz.id = qq.quiz_id
      where qz.is_published = true and public.has_active_enrollment(qz.course_id)
    )
  );

drop policy if exists "consolidated_insert" on public.quiz_options;
create policy "consolidated_insert" on public.quiz_options
  for insert
  with check (
    public.has_role('admin')
    or question_id in (
      select qq.id from public.quiz_questions qq join public.quizzes qz on qz.id = qq.quiz_id
      where public.is_course_mentor(qz.course_id)
    )
  );

drop policy if exists "consolidated_update" on public.quiz_options;
create policy "consolidated_update" on public.quiz_options
  for update
  using (
    public.has_role('admin')
    or question_id in (
      select qq.id from public.quiz_questions qq join public.quizzes qz on qz.id = qq.quiz_id
      where public.is_course_mentor(qz.course_id)
    )
  );

drop policy if exists "consolidated_delete" on public.quiz_options;
create policy "consolidated_delete" on public.quiz_options
  for delete
  using (
    public.has_role('admin')
    or question_id in (
      select qq.id from public.quiz_questions qq join public.quizzes qz on qz.id = qq.quiz_id
      where public.is_course_mentor(qz.course_id)
    )
  );

-- quiz_attempts
drop policy if exists "consolidated_select" on public.quiz_attempts;
create policy "consolidated_select" on public.quiz_attempts
  for select
  using (
    public.has_role('admin')
    or enrollment_id in (select e.id from public.enrollments e where e.student_id = auth.uid())
    or quiz_id in (select q.id from public.quizzes q where public.is_course_mentor(q.course_id))
  );

-- quiz_answers
drop policy if exists "consolidated_select" on public.quiz_answers;
create policy "consolidated_select" on public.quiz_answers
  for select
  using (
    public.has_role('admin')
    or attempt_id in (
      select qa.id from public.quiz_attempts qa join public.enrollments e on e.id = qa.enrollment_id
      where e.student_id = auth.uid()
    )
    or attempt_id in (
      select qa.id from public.quiz_attempts qa join public.quizzes q on q.id = qa.quiz_id
      where public.is_course_mentor(q.course_id)
    )
  );

-- certificates
drop policy if exists "consolidated_select" on public.certificates;
create policy "consolidated_select" on public.certificates
  for select
  using (
    public.has_role('admin')
    or enrollment_id in (select e.id from public.enrollments e where e.student_id = auth.uid())
    or enrollment_id in (select e.id from public.enrollments e where public.is_course_mentor(e.course_id))
  );

-- course_progress
drop policy if exists "consolidated_select" on public.course_progress;
create policy "consolidated_select" on public.course_progress
  for select
  using (
    public.has_role('admin')
    or enrollment_id in (select e.id from public.enrollments e where public.is_course_mentor(e.course_id))
    or enrollment_id in (select e.id from public.enrollments e where e.student_id = auth.uid())
  );

-- lesson_progress
drop policy if exists "consolidated_select" on public.lesson_progress;
create policy "consolidated_select" on public.lesson_progress
  for select
  using (
    public.has_role('admin')
    or enrollment_id in (select e.id from public.enrollments e where public.is_course_mentor(e.course_id))
    or enrollment_id in (select e.id from public.enrollments e where e.student_id = auth.uid())
  );

-- enrollments
drop policy if exists "consolidated_select" on public.enrollments;
create policy "consolidated_select" on public.enrollments
  for select
  using (
    public.has_role('admin')
    or public.is_course_mentor(course_id)
    or student_id = auth.uid()
  );
