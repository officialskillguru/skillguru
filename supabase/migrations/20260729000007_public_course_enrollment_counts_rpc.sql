-- Same root cause as 20260729000006: `enrollments` correctly has no public
-- SELECT policy, but mentor.repository.ts's findBySlug() (the actual public
-- mentor profile page, not just the catalog) queries `enrollments` directly
-- per-course to show "N students enrolled" per course and the mentor's total
-- "Students" stat - both silently read as 0 for every real anonymous visitor.
-- Aggregate-only RPC, per course this time (coursesTaught needs per-course
-- granularity), never exposing any individual enrollment/student row.

CREATE OR REPLACE FUNCTION public.get_public_course_enrollment_counts(p_course_ids uuid[])
RETURNS TABLE (course_id uuid, enrollment_count bigint) AS $$
    SELECT e.course_id, COUNT(*) AS enrollment_count
    FROM public.enrollments e
    WHERE e.course_id = ANY(p_course_ids)
    GROUP BY e.course_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_public_course_enrollment_counts(uuid[]) TO anon, authenticated;
