-- Storage buckets + storage.objects RLS, captured as a migration.
--
-- Until now the five application buckets (and their policies) existed only in
-- the original project's dashboard, so a fresh project built from migrations
-- had no storage at all. This recreates them to match how the app uses them
-- (src/services/storage.service.ts):
--   private (signed URLs): courses, admins, students
--   public  (getPublicUrl): mentors, success-stories
--
-- Path conventions the policies rely on:
--   courses/<course_id>/...            (admin or course mentor uploads)
--   students/<user_id>/...             (student's own files)
--   admins/...                         (admin-only, e.g. mentor-documents/<mentor_id>/...)
--   mentors/<user_id|projects|certifications>/...
--   success-stories/...                (admin managed)
--
-- Idempotent: buckets are inserted ON CONFLICT DO NOTHING (existing bucket
-- settings are never overwritten); policies are dropped-if-exists and recreated.

-- Allowed MIME types mirror the client-side allowlist in storage.service.ts.
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES
  ('courses',         'courses',         false, ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('admins',          'admins',          false, ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('students',        'students',        false, ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('mentors',         'mentors',         true,  ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('success-stories', 'success-stories', true,  ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- First folder segment as uuid, or NULL when it isn't one. A bare ::uuid cast
-- would raise on non-uuid folders and abort the whole storage request.
CREATE OR REPLACE FUNCTION public.storage_folder_uuid(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN ((storage.foldername(object_name))[1])::uuid
  END;
$$;

-- True when the object is the thumbnail or promo video of a published course,
-- so public course cards can render media for logged-out visitors without
-- opening up lesson content.
CREATE OR REPLACE FUNCTION public.is_published_course_media(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.files f
    JOIN public.courses c
      ON f.id IN (c.thumbnail_file_id, c.promo_video_file_id)
    WHERE f.bucket = 'courses'
      AND f.storage_path = object_name
      AND f.deleted_at IS NULL
      AND c.status = 'published'
      AND c.deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_published_course_media(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_course_media(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_folder_uuid(text) TO anon, authenticated;

-- ---------------------------------------------------------------- courses
DROP POLICY IF EXISTS "courses: read (admin, mentor, enrolled, published media)" ON storage.objects;
CREATE POLICY "courses: read (admin, mentor, enrolled, published media)" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'courses' AND (
      public.has_role('admin')
      OR public.is_course_mentor(public.storage_folder_uuid(name))
      OR public.has_active_enrollment(public.storage_folder_uuid(name))
      OR public.is_published_course_media(name)
    )
  );

DROP POLICY IF EXISTS "courses: insert (admin or course mentor)" ON storage.objects;
CREATE POLICY "courses: insert (admin or course mentor)" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'courses' AND (
      public.has_role('admin')
      OR public.is_course_mentor(public.storage_folder_uuid(name))
    )
  );

DROP POLICY IF EXISTS "courses: update (admin or course mentor)" ON storage.objects;
CREATE POLICY "courses: update (admin or course mentor)" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'courses' AND (
      public.has_role('admin')
      OR public.is_course_mentor(public.storage_folder_uuid(name))
    )
  )
  WITH CHECK (
    bucket_id = 'courses' AND (
      public.has_role('admin')
      OR public.is_course_mentor(public.storage_folder_uuid(name))
    )
  );

DROP POLICY IF EXISTS "courses: delete (admin or course mentor)" ON storage.objects;
CREATE POLICY "courses: delete (admin or course mentor)" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'courses' AND (
      public.has_role('admin')
      OR public.is_course_mentor(public.storage_folder_uuid(name))
    )
  );

-- ---------------------------------------------------------------- students
DROP POLICY IF EXISTS "students: read (own folder, admin, counsellor)" ON storage.objects;
CREATE POLICY "students: read (own folder, admin, counsellor)" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'students' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role('admin')
      OR public.has_role('counsellor')
    )
  );

DROP POLICY IF EXISTS "students: insert (own folder or admin)" ON storage.objects;
CREATE POLICY "students: insert (own folder or admin)" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'students' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role('admin')
    )
  );

DROP POLICY IF EXISTS "students: update (own folder or admin)" ON storage.objects;
CREATE POLICY "students: update (own folder or admin)" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'students' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role('admin')
    )
  )
  WITH CHECK (
    bucket_id = 'students' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role('admin')
    )
  );

DROP POLICY IF EXISTS "students: delete (own folder or admin)" ON storage.objects;
CREATE POLICY "students: delete (own folder or admin)" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'students' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role('admin')
    )
  );

-- ---------------------------------------------------------------- admins
DROP POLICY IF EXISTS "admins: admin only" ON storage.objects;
CREATE POLICY "admins: admin only" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'admins' AND public.has_role('admin'))
  WITH CHECK (bucket_id = 'admins' AND public.has_role('admin'));

-- ---------------------------------------------------------------- mentors (public bucket)
-- No broad SELECT policy on purpose (see 20260729000014): public objects are
-- served via /object/public/ without RLS. The owner-scoped SELECT below only
-- lets uploaders manage (and roll back) their own objects - it does not allow
-- listing other mentors' files.
DROP POLICY IF EXISTS "mentors: insert (mentor or admin)" ON storage.objects;
CREATE POLICY "mentors: insert (mentor or admin)" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mentors' AND (public.has_role('mentor') OR public.has_role('admin'))
  );

DROP POLICY IF EXISTS "mentors: read own objects (or admin)" ON storage.objects;
CREATE POLICY "mentors: read own objects (or admin)" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mentors' AND (owner_id = auth.uid()::text OR public.has_role('admin'))
  );

DROP POLICY IF EXISTS "mentors: update own objects (or admin)" ON storage.objects;
CREATE POLICY "mentors: update own objects (or admin)" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mentors' AND (owner_id = auth.uid()::text OR public.has_role('admin'))
  )
  WITH CHECK (
    bucket_id = 'mentors' AND (owner_id = auth.uid()::text OR public.has_role('admin'))
  );

DROP POLICY IF EXISTS "mentors: delete own objects (or admin)" ON storage.objects;
CREATE POLICY "mentors: delete own objects (or admin)" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'mentors' AND (owner_id = auth.uid()::text OR public.has_role('admin'))
  );

-- ---------------------------------------------------------------- success-stories (public bucket)
DROP POLICY IF EXISTS "success-stories: admin manage" ON storage.objects;
CREATE POLICY "success-stories: admin manage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'success-stories' AND public.has_role('admin'))
  WITH CHECK (bucket_id = 'success-stories' AND public.has_role('admin'));
