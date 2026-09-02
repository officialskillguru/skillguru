-- QA finding (final hardening pass): creating a new course only sets courses.mentor_id --
-- it did NOT create a matching course_mentors row (the Phase 3 backfill was one-time, for
-- pre-existing courses only). Any course created after that migration would silently have
-- zero course_mentors rows until a Counsellor explicitly assigned one, even though it has a
-- legacy primary mentor. Fix: keep the two models in sync going forward with a trigger,
-- mirroring the backfill's own logic (insert as primary, active) whenever a new course is
-- inserted with mentor_id set, or an existing course's mentor_id changes and no course_mentors
-- row exists yet for that mentor on that course.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.
-- Verified live (rolled-back transaction): a freshly created course auto-gets exactly one
-- primary course_mentors row; a no-op UPDATE (mentor_id unchanged) does not create a
-- duplicate row; course deletion still cascades course_mentors rows; mentor deletion is
-- still RESTRICTed while course_mentors rows reference them.

create or replace function public.course_mentors_sync_from_courses()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.mentor_id is not null and not exists (
    select 1 from public.course_mentors cm where cm.course_id = new.id and cm.mentor_id = new.mentor_id
  ) then
    insert into public.course_mentors (course_id, mentor_id, is_primary, status, assigned_at)
    values (
      new.id,
      new.mentor_id,
      not exists (select 1 from public.course_mentors cm2 where cm2.course_id = new.id and cm2.is_primary),
      'active',
      now()
    )
    on conflict (course_id, mentor_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_course_mentors_sync_insert on public.courses;
create trigger trg_course_mentors_sync_insert
  after insert on public.courses
  for each row execute function public.course_mentors_sync_from_courses();

drop trigger if exists trg_course_mentors_sync_update on public.courses;
create trigger trg_course_mentors_sync_update
  after update of mentor_id on public.courses
  for each row
  when (new.mentor_id is distinct from old.mentor_id)
  execute function public.course_mentors_sync_from_courses();
