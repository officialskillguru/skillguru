-- ============================================================================
-- Let visitors resolve thumbnails / promo videos of PUBLISHED courses.
-- ============================================================================
-- Problem: course media lives in the private `courses` bucket with
-- files.is_public = false. The storage.objects policy already lets anon and
-- authenticated users read those objects via public.is_published_course_media()
-- (20261116000001), but the client first has to read the matching row in
-- public.files to learn the storage path (storage.service.ts resolveFileUrl).
-- public.files only exposes rows to the uploader, admins, or is_public = true,
-- so for every other viewer the lookup returns nothing and the course card
-- silently falls back to placeholder art.
--
-- Fix: an additive SELECT policy exposing exactly the files rows referenced as
-- thumbnail_file_id / promo_video_file_id of a published, non-deleted course.
-- Lesson videos, documents and anything on draft courses stay private.
-- Idempotent; does not modify or drop any existing policy.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_published_course_media_file(p_file_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE p_file_id IN (c.thumbnail_file_id, c.promo_video_file_id)
      AND c.status = 'published'
      AND c.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.is_published_course_media_file(uuid) IS
  'True when the file is the thumbnail or promo video of a published course. SECURITY DEFINER so the files RLS policy can consult courses without recursive RLS evaluation.';

REVOKE ALL ON FUNCTION public.is_published_course_media_file(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_course_media_file(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view published course media files" ON public.files;
CREATE POLICY "Anyone can view published course media files" ON public.files
  FOR SELECT TO anon, authenticated
  USING (
    bucket = 'courses'
    AND deleted_at IS NULL
    AND public.is_published_course_media_file(id)
  );
