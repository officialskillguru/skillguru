-- The public mentor profile page's "Courses Taught" section previously
-- hardcoded hasCertificate: true and projectsCount: 0 for every course
-- (see mentor.repository.ts task #61) instead of showing real data.
-- `assignments` and `certificates` both correctly have no public SELECT
-- policy (enrolled student / course mentor / admin only), so anonymous
-- visitors need narrow aggregate RPCs, mirroring the existing
-- get_public_course_enrollment_counts pattern.

CREATE OR REPLACE FUNCTION public.get_public_course_project_counts(p_course_ids uuid[])
RETURNS TABLE (course_id uuid, project_count bigint) AS $$
    SELECT a.course_id, count(*) AS project_count
    FROM public.assignments a
    WHERE a.course_id = ANY(p_course_ids) AND a.status IN ('active', 'closed')
    GROUP BY a.course_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_public_course_project_counts(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_course_certificate_availability(p_course_ids uuid[])
RETURNS TABLE (course_id uuid) AS $$
    SELECT DISTINCT e.course_id
    FROM public.certificates c
    JOIN public.enrollments e ON e.id = c.enrollment_id
    WHERE e.course_id = ANY(p_course_ids);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_public_course_certificate_availability(uuid[]) TO anon, authenticated;
