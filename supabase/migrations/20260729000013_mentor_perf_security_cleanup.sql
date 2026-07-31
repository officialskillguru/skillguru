-- Perf/security cleanup found via advisors while finishing the Mentor module audit.
--
-- 1) mentor_achievements/certifications/experience/projects each had a
--    `FOR ALL` "Write" policy stacked on top of a `FOR SELECT` "Select"
--    policy. Postgres evaluates every permissive policy that applies to a
--    given action, so every SELECT was needlessly evaluating both policies'
--    quals. Narrowing "Write" to INSERT/UPDATE/DELETE removes the overlap
--    with no change in effective permissions (the same OR-condition still
--    governs writes).
--
-- 2) Several mentor-related tables had foreign keys with no covering index
--    (mentor_documents.file_id/uploaded_by, mentor_invites.invited_by/user_id,
--    mentor_notes.author_id/mentor_id, mentor_profiles.locked_by), which can
--    force sequential scans on the referenced side for lookups/joins/FK
--    cascade checks.

DROP POLICY "Write mentor_achievements" ON public.mentor_achievements;
CREATE POLICY "Write mentor_achievements" ON public.mentor_achievements
    FOR INSERT WITH CHECK ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));
CREATE POLICY "Update mentor_achievements" ON public.mentor_achievements
    FOR UPDATE USING ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));
CREATE POLICY "Delete mentor_achievements" ON public.mentor_achievements
    FOR DELETE USING ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));

DROP POLICY "Write mentor_certifications" ON public.mentor_certifications;
CREATE POLICY "Write mentor_certifications" ON public.mentor_certifications
    FOR INSERT WITH CHECK ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));
CREATE POLICY "Update mentor_certifications" ON public.mentor_certifications
    FOR UPDATE USING ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));
CREATE POLICY "Delete mentor_certifications" ON public.mentor_certifications
    FOR DELETE USING ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));

DROP POLICY "Write mentor_experience" ON public.mentor_experience;
CREATE POLICY "Write mentor_experience" ON public.mentor_experience
    FOR INSERT WITH CHECK ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));
CREATE POLICY "Update mentor_experience" ON public.mentor_experience
    FOR UPDATE USING ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));
CREATE POLICY "Delete mentor_experience" ON public.mentor_experience
    FOR DELETE USING ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));

DROP POLICY "Write mentor_projects" ON public.mentor_projects;
CREATE POLICY "Write mentor_projects" ON public.mentor_projects
    FOR INSERT WITH CHECK ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));
CREATE POLICY "Update mentor_projects" ON public.mentor_projects
    FOR UPDATE USING ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));
CREATE POLICY "Delete mentor_projects" ON public.mentor_projects
    FOR DELETE USING ((mentor_id = ( SELECT auth.uid() AS uid)) OR has_role('admin'::text));

CREATE INDEX IF NOT EXISTS idx_mentor_documents_file_id ON public.mentor_documents (file_id);
CREATE INDEX IF NOT EXISTS idx_mentor_documents_uploaded_by ON public.mentor_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_mentor_invites_invited_by ON public.mentor_invites (invited_by);
CREATE INDEX IF NOT EXISTS idx_mentor_invites_user_id ON public.mentor_invites (user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_author_id ON public.mentor_notes (author_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_mentor_id ON public.mentor_notes (mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_locked_by ON public.mentor_profiles (locked_by);
