-- Live Classes DEMO feature (Admin/Teacher Master Command, Part 13/14).
--
-- This is an explicitly DEMO-ONLY feature: there is no real video/meeting
-- provider wired up yet (no Zoom/Meet/WebRTC integration). The table and RLS
-- below are the real, permanent architectural boundary a future real
-- integration will sit behind — `meeting_platform`/`meeting_link` already
-- model an external provider so swapping in a real one later is additive,
-- not a rewrite. `is_demo` defaults true and is surfaced in the UI as a
-- "Demo / Coming Soon" badge; nothing here is presented to users as a real
-- live class.
--
-- Scoping mirrors the existing is_course_mentor()-based pattern used for
-- assignments/attendance/quizzes: a teacher only sees/manages live classes
-- for courses they are actually assigned to via course_mentors, a student
-- only sees classes for courses they are actively enrolled in, and admin
-- sees everything.

create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  scheduled_date date not null,
  start_time time not null,
  end_time time not null,
  meeting_platform text not null default 'demo',
  meeting_link text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  is_demo boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.live_classes is
  'DEMO-ONLY live class scheduling. No real video/meeting provider is connected yet — meeting_platform/meeting_link exist as the architectural boundary for a future real integration. is_demo is always true today.';

create index live_classes_course_id_idx on public.live_classes (course_id);
create index live_classes_mentor_id_idx on public.live_classes (mentor_id);
create index live_classes_scheduled_date_idx on public.live_classes (scheduled_date);

create trigger live_classes_set_updated_at
  before update on public.live_classes
  for each row execute function public.set_updated_at();

alter table public.live_classes enable row level security;

create policy "consolidated_select" on public.live_classes
  for select
  using (
    public.has_role('admin')
    or public.is_course_mentor(course_id)
    or (course_id in (
      select e.course_id from public.enrollments e
      where e.student_id = auth.uid() and e.status = 'active'
    ))
  );

create policy "consolidated_insert" on public.live_classes
  for insert
  with check (public.has_role('admin') or public.is_course_mentor(course_id));

create policy "consolidated_update" on public.live_classes
  for update
  using (public.has_role('admin') or public.is_course_mentor(course_id))
  with check (public.has_role('admin') or public.is_course_mentor(course_id));

create policy "consolidated_delete" on public.live_classes
  for delete
  using (public.has_role('admin') or public.is_course_mentor(course_id));
