-- Phase 7: extend success_stories with optional placement-success fields.
-- All nullable/additive. Course creation/publish is unaffected either way.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.
alter table public.success_stories
  add column if not exists candidate_video_url text,
  add column if not exists testimonial text,
  add column if not exists course_id uuid references public.courses(id) on delete set null;

create index if not exists idx_success_stories_course on public.success_stories(course_id);
