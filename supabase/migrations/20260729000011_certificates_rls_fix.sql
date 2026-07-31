-- Real, serious security bug found while auditing the mentor module's
-- "hasCertificate" course claim: `certificates`' consolidated_select policy
-- literally contained `(true OR ...)`, which collapses to always-true —
-- meaning EVERY certificate row (student name via join, verification_code,
-- certificate_number) has been publicly readable by anyone, not just the
-- owning student/mentor/admin. This also meant `getStudentCertificates`'s
-- own `.eq("enrollment.student_id", studentId)` filter was the *only*
-- protection against one student reading another's certificates — RLS
-- provided none.
--
-- Fix: replace with the intended scoping (admin, the enrolled student, or
-- the course's mentor). The public "verify a certificate by code" feature
-- (VerifyCertificatePage) is real and needs to stay reachable by anonymous
-- visitors, but a full-table-readable policy is the wrong way to support it
-- (it allows enumeration, not just single-code verification) — replaced with
-- a narrow SECURITY DEFINER RPC that only returns a match for the exact code
-- supplied, mirroring the get_public_mentor_profiles pattern.

DROP POLICY IF EXISTS consolidated_select ON public.certificates;
CREATE POLICY consolidated_select ON public.certificates FOR SELECT
    USING (
        public.has_role('admin')
        OR enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = auth.uid())
        OR enrollment_id IN (
            SELECT e.id FROM public.enrollments e
            JOIN public.courses c ON c.id = e.course_id
            WHERE c.mentor_id = auth.uid()
        )
    );

CREATE OR REPLACE FUNCTION public.verify_certificate_by_code(p_code text)
RETURNS TABLE (
    id uuid,
    certificate_number varchar,
    verification_code varchar,
    issued_at timestamptz,
    course_title text,
    student_name text
) AS $$
    SELECT c.id, c.certificate_number, c.verification_code, c.issued_at, co.title, p.full_name
    FROM public.certificates c
    JOIN public.enrollments e ON e.id = c.enrollment_id
    JOIN public.courses co ON co.id = e.course_id
    JOIN public.profiles p ON p.id = e.student_id
    WHERE c.verification_code = p_code;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.verify_certificate_by_code(text) TO anon, authenticated;
