-- ============================================================================
-- Public curriculum outline for published courses.
-- ============================================================================
-- Problem: the lessons RLS policy only exposes free-preview lessons (or lessons
-- of courses the caller is enrolled in). That is correct for lesson CONTENT,
-- but the public course-detail page also needs the curriculum OUTLINE (lesson
-- titles, types, durations) so visitors can see what they would learn before
-- enrolling. Today a logged-out visitor sees module titles with ~0 lessons and
-- a wrong total lesson count / duration.
--
-- Fix: a SECURITY DEFINER function that returns outline metadata ONLY —
-- never text_content, video_file_id or any other lesson body — and only for
-- published, non-deleted courses. The lessons RLS policy is unchanged, so
-- lesson content stays restricted to enrolled learners / free previews.
-- Idempotent and additive.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_course_outline(p_course_id uuid)
RETURNS TABLE (
  module_id uuid,
  module_title text,
  module_description text,
  module_sort_order integer,
  lesson_id uuid,
  lesson_title text,
  content_type public.content_type,
  duration_seconds integer,
  is_free_preview boolean,
  lesson_sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id, m.title, m.description, m.sort_order,
    l.id, l.title, l.content_type, l.duration_seconds, l.is_free_preview, l.sort_order
  FROM public.courses c
  JOIN public.modules m ON m.course_id = c.id AND m.deleted_at IS NULL
  LEFT JOIN public.lessons l ON l.module_id = m.id AND l.deleted_at IS NULL
  WHERE c.id = p_course_id
    AND c.status = 'published'
    AND c.deleted_at IS NULL
  ORDER BY m.sort_order, l.sort_order;
$$;

COMMENT ON FUNCTION public.get_public_course_outline(uuid) IS
  'Curriculum outline (titles, types, durations, preview flags) for a published course. Never returns lesson content. Used by the public course-detail page.';

REVOKE ALL ON FUNCTION public.get_public_course_outline(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_course_outline(uuid) TO anon, authenticated;
