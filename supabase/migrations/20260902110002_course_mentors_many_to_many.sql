-- Phase 3: course <-> mentor many-to-many.
-- Additive only. courses.mentor_id is kept as the denormalized "primary/legacy" pointer
-- and is NOT dropped or made nullable in this migration. Every existing course is backfilled
-- into course_mentors as its primary assignment, so both models agree from day one.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02;
-- verified: backfill 6/6 courses, inactive-mentor guard rejects assignment, duplicate
-- (course_id, mentor_id) rejected by unique constraint, multi-mentor insert succeeds.

create table if not exists public.course_mentors (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  mentor_id uuid not null references public.mentor_profiles(id) on delete restrict,
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive')),
  sort_order integer not null default 0,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, mentor_id)
);

create index if not exists idx_course_mentors_course on public.course_mentors(course_id);
create index if not exists idx_course_mentors_mentor on public.course_mentors(mentor_id);

-- exactly one primary mentor per course
create unique index if not exists uq_course_mentors_primary
  on public.course_mentors(course_id) where is_primary;

create or replace function public.course_mentors_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_course_mentors_updated_at on public.course_mentors;
create trigger trg_course_mentors_updated_at
  before update on public.course_mentors
  for each row execute function public.course_mentors_set_updated_at();

-- Guard: an inactive, suspended, or soft-deleted mentor cannot be newly assigned.
-- Existing rows for a mentor who later becomes inactive are left untouched (data-safe) —
-- this only blocks new INSERTs and reactivating an inactive row via UPDATE.
create or replace function public.course_mentors_guard_active_mentor()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_status text;
  v_deleted_at timestamptz;
begin
  select status, deleted_at into v_status, v_deleted_at
  from public.mentor_profiles where id = new.mentor_id;

  if v_deleted_at is not null then
    raise exception 'Cannot assign a deleted mentor to a course';
  end if;

  if v_status is not null and v_status not in ('active') then
    raise exception 'Cannot assign an inactive/suspended mentor to a course';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_course_mentors_guard_active on public.course_mentors;
create trigger trg_course_mentors_guard_active
  before insert on public.course_mentors
  for each row execute function public.course_mentors_guard_active_mentor();

alter table public.course_mentors enable row level security;

-- SELECT: admin/counsellor see all; mentor sees their own assignments;
-- everyone (incl. anon) can see assignments for published courses (needed for public course pages).
drop policy if exists "course_mentors_select_admin_counsellor" on public.course_mentors;
create policy "course_mentors_select_admin_counsellor" on public.course_mentors
  for select
  using (public.has_role('admin') or public.has_permission('courses.assign_mentor'));

drop policy if exists "course_mentors_select_own_mentor" on public.course_mentors;
create policy "course_mentors_select_own_mentor" on public.course_mentors
  for select
  using (mentor_id = auth.uid());

drop policy if exists "course_mentors_select_public_published" on public.course_mentors;
create policy "course_mentors_select_public_published" on public.course_mentors
  for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_mentors.course_id and c.status = 'published'
    )
  );

-- INSERT/UPDATE/DELETE: admin, or a caller holding courses.assign_mentor (Counsellor).
drop policy if exists "course_mentors_write_admin_counsellor" on public.course_mentors;
create policy "course_mentors_write_admin_counsellor" on public.course_mentors
  for all
  using (public.has_role('admin') or public.has_permission('courses.assign_mentor'))
  with check (public.has_role('admin') or public.has_permission('courses.assign_mentor'));

-- Backfill: one primary row per existing course from the legacy single-owner column.
insert into public.course_mentors (course_id, mentor_id, is_primary, status, assigned_at)
select c.id, c.mentor_id, true, 'active', c.created_at
from public.courses c
where not exists (
  select 1 from public.course_mentors cm where cm.course_id = c.id and cm.mentor_id = c.mentor_id
);
