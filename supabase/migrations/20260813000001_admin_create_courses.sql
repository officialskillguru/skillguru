-- ============================================================================
-- Admin course creation was silently broken: courses had exactly one INSERT
-- policy ("Mentors create own courses", WITH CHECK mentor_id = auth.uid()),
-- and no admin-authored equivalent. AdminCoursesPage lets an admin pick any
-- mentor from a dropdown and create the course as that mentor - every such
-- insert was rejected by RLS (42501) and surfaced to the admin as a generic
-- "unexpected error". This is purely additive: the existing mentor policy is
-- untouched, this only OR's in a second, narrower-scoped allowance for admins
-- (mirrors the "Admins update all courses" / consolidated_update pattern
-- already proven on this same table).
-- ============================================================================
DROP POLICY IF EXISTS "Admins create courses" ON public.courses;
CREATE POLICY "Admins create courses" ON public.courses FOR INSERT
WITH CHECK (has_role('admin'));
