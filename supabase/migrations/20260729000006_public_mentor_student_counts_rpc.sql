-- Companion to get_public_mentor_profiles (see 20260729000005): `enrollments`
-- correctly has no public SELECT policy (only admin/course-owner-mentor/the
-- enrolled student themselves) - that's a genuine, correct privacy boundary,
-- not a bug. But it means the "Students Mentored" stat on the public mentor
-- catalog/profile pages was always going to read as 0 for any real anonymous
-- visitor, since the client-side code queries `enrollments` directly. Fix:
-- a narrow aggregate-only RPC that returns just a per-mentor count, never any
-- individual enrollment/student row.

CREATE OR REPLACE FUNCTION public.get_public_mentor_student_counts(p_mentor_ids uuid[])
RETURNS TABLE (mentor_id uuid, student_count bigint) AS $$
    SELECT c.mentor_id, COUNT(DISTINCT e.student_id) AS student_count
    FROM public.courses c
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE c.mentor_id = ANY(p_mentor_ids)
      AND c.deleted_at IS NULL
    GROUP BY c.mentor_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_public_mentor_student_counts(uuid[]) TO anon, authenticated;
