-- Follow-up to 20260727000001: the advisor flagged auth_rls_initplan (unwrapped
-- auth.uid()) and multiple_permissive_policies on the four new mentor content
-- tables - the exact pattern this project already did a dedicated cleanup pass
-- for once (Phase 0.7). Consolidating to one policy per command per table,
-- OR-ing the original conditions together, with auth.uid() wrapped in (select ...),
-- matching that same established technique.

-- =========================================================================
-- mentor_experience
-- =========================================================================
DROP POLICY IF EXISTS "Public read mentor_experience" ON public.mentor_experience;
DROP POLICY IF EXISTS "Mentors manage own mentor_experience" ON public.mentor_experience;
DROP POLICY IF EXISTS "Admins manage mentor_experience" ON public.mentor_experience;

CREATE POLICY "Select mentor_experience" ON public.mentor_experience
    FOR SELECT USING (
        deleted_at IS NULL OR mentor_id = (select auth.uid()) OR public.has_role('admin')
    );
CREATE POLICY "Write mentor_experience" ON public.mentor_experience
    FOR ALL
    USING (mentor_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (mentor_id = (select auth.uid()) OR public.has_role('admin'));

-- =========================================================================
-- mentor_projects
-- =========================================================================
DROP POLICY IF EXISTS "Public read mentor_projects" ON public.mentor_projects;
DROP POLICY IF EXISTS "Mentors manage own mentor_projects" ON public.mentor_projects;
DROP POLICY IF EXISTS "Admins manage mentor_projects" ON public.mentor_projects;

CREATE POLICY "Select mentor_projects" ON public.mentor_projects
    FOR SELECT USING (
        deleted_at IS NULL OR mentor_id = (select auth.uid()) OR public.has_role('admin')
    );
CREATE POLICY "Write mentor_projects" ON public.mentor_projects
    FOR ALL
    USING (mentor_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (mentor_id = (select auth.uid()) OR public.has_role('admin'));

-- =========================================================================
-- mentor_certifications
-- =========================================================================
DROP POLICY IF EXISTS "Public read mentor_certifications" ON public.mentor_certifications;
DROP POLICY IF EXISTS "Mentors manage own mentor_certifications" ON public.mentor_certifications;
DROP POLICY IF EXISTS "Admins manage mentor_certifications" ON public.mentor_certifications;

CREATE POLICY "Select mentor_certifications" ON public.mentor_certifications
    FOR SELECT USING (
        deleted_at IS NULL OR mentor_id = (select auth.uid()) OR public.has_role('admin')
    );
CREATE POLICY "Write mentor_certifications" ON public.mentor_certifications
    FOR ALL
    USING (mentor_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (mentor_id = (select auth.uid()) OR public.has_role('admin'));

-- =========================================================================
-- mentor_achievements
-- =========================================================================
DROP POLICY IF EXISTS "Public read mentor_achievements" ON public.mentor_achievements;
DROP POLICY IF EXISTS "Mentors manage own mentor_achievements" ON public.mentor_achievements;
DROP POLICY IF EXISTS "Admins manage mentor_achievements" ON public.mentor_achievements;

CREATE POLICY "Select mentor_achievements" ON public.mentor_achievements
    FOR SELECT USING (
        deleted_at IS NULL OR mentor_id = (select auth.uid()) OR public.has_role('admin')
    );
CREATE POLICY "Write mentor_achievements" ON public.mentor_achievements
    FOR ALL
    USING (mentor_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (mentor_id = (select auth.uid()) OR public.has_role('admin'));

-- =========================================================================
-- meetings: attendee policies kept separate from the existing host/admin
-- "consolidated_all" policy on purpose (attendees get narrower SELECT +
-- cancel-only UPDATE, not the full host/admin ALL scope - merging them would
-- over-grant). Only fixing the unwrapped auth.uid() initplan cost here.
-- =========================================================================
DROP POLICY IF EXISTS "Attendees view own booked meetings" ON public.meetings;
DROP POLICY IF EXISTS "Attendees cancel own booking" ON public.meetings;

CREATE POLICY "Attendees view own booked meetings" ON public.meetings
    FOR SELECT USING (attendee_id = (select auth.uid()));
CREATE POLICY "Attendees cancel own booking" ON public.meetings
    FOR UPDATE
    USING (attendee_id = (select auth.uid()))
    WITH CHECK (attendee_id = (select auth.uid()) AND status = 'cancelled');

-- =========================================================================
-- Covering indexes for the created_by/updated_by/file FK columns (flagged
-- by the performance advisor as unindexed foreign keys - INFO level, but
-- cheap to add now while the tables are new and empty).
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_mentor_experience_created_by ON public.mentor_experience(created_by);
CREATE INDEX IF NOT EXISTS idx_mentor_experience_updated_by ON public.mentor_experience(updated_by);

CREATE INDEX IF NOT EXISTS idx_mentor_projects_created_by ON public.mentor_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_mentor_projects_updated_by ON public.mentor_projects(updated_by);
CREATE INDEX IF NOT EXISTS idx_mentor_projects_image_file_id ON public.mentor_projects(image_file_id);

CREATE INDEX IF NOT EXISTS idx_mentor_certifications_created_by ON public.mentor_certifications(created_by);
CREATE INDEX IF NOT EXISTS idx_mentor_certifications_updated_by ON public.mentor_certifications(updated_by);
CREATE INDEX IF NOT EXISTS idx_mentor_certifications_issuer_logo_file_id ON public.mentor_certifications(issuer_logo_file_id);

CREATE INDEX IF NOT EXISTS idx_mentor_achievements_created_by ON public.mentor_achievements(created_by);
CREATE INDEX IF NOT EXISTS idx_mentor_achievements_updated_by ON public.mentor_achievements(updated_by);
