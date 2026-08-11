-- ============================================================================
-- Mentor job-posting management (Phase J) - additive on top of the existing
-- placement/ATS schema (20260727073017_placement_module_schema.sql, NOT
-- modified here). That migration shipped job_postings/hiring_partners as
-- fully admin-only (INSERT/UPDATE/DELETE all require has_role('admin')) -
-- confirmed via direct inspection, not assumed. This migration adds the
-- mentor-authored path: a mentor may create/edit/archive their OWN job
-- postings, but publishing (status -> 'open') still requires admin review,
-- mirroring the exact defense-in-depth pattern already proven for courses
-- (enforce_course_status_transition) and categories
-- (enforce_category_proposal_ownership): RLS decides *whether* a mentor can
-- write at all; a trigger decides *which status transition* that write is
-- allowed to make, regardless of what the client sends.
--
-- Admin's existing full authority (has_role('admin') branch on every
-- existing job_postings/placement_applications/etc. policy) is completely
-- unchanged - every change below is a new, additional OR-branch, never a
-- narrowing of what admin can already do.
-- ============================================================================

-- SECTION 1: jobs.manage_own permission, granted to the mentor role
-- ----------------------------------------------------------------------------
INSERT INTO public.permissions (slug, name, module, description) VALUES
    ('jobs.manage_own', 'Manage Own Job Postings', 'placements', 'Create, edit, submit for review, and archive the mentor''s own job postings')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _perm_id uuid;
BEGIN
    SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
    SELECT id INTO _perm_id FROM public.permissions WHERE slug = 'jobs.manage_own';
    IF _mentor_role IS NOT NULL AND _perm_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (_mentor_role, _perm_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- SECTION 2: add 'under_review' to the job_postings status set
-- ----------------------------------------------------------------------------
-- Existing states (draft/open/closed/cancelled) map to Draft/Published/
-- Closed/Archived. 'under_review' is the new admin-approval gate for
-- mentor-authored postings - additive widening of the CHECK constraint,
-- every existing row's status is already a member of the new allowed set.
ALTER TABLE public.job_postings DROP CONSTRAINT job_postings_status_check;
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_status_check
    CHECK (status IN ('draft', 'under_review', 'open', 'closed', 'cancelled'));

-- SECTION 3: RLS - additive mentor-ownership branches
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "job_postings_select" ON public.job_postings;
CREATE POLICY "job_postings_select" ON public.job_postings FOR SELECT
    USING (
        (status = 'open' AND deleted_at IS NULL)
        OR has_role('admin')
        OR created_by = auth.uid()
    );

DROP POLICY IF EXISTS "job_postings_insert" ON public.job_postings;
CREATE POLICY "job_postings_insert" ON public.job_postings FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR (has_permission('jobs.manage_own') AND created_by = auth.uid())
    );

DROP POLICY IF EXISTS "job_postings_update" ON public.job_postings;
CREATE POLICY "job_postings_update" ON public.job_postings FOR UPDATE
    USING (
        has_role('admin')
        OR (has_permission('jobs.manage_own') AND created_by = auth.uid())
    )
    WITH CHECK (
        has_role('admin')
        OR (has_permission('jobs.manage_own') AND created_by = auth.uid())
    );

-- job_postings_delete stays admin-only (unchanged) - mentors archive their
-- own postings via the same soft-delete-via-UPDATE path softDeleteJobPosting
-- already uses for admin (status='cancelled', deleted_at set), not a real
-- DELETE. No application code path issues a hard DELETE at all today.

-- SECTION 4: force mentor-authored status/ownership - never trust the client
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_job_posting_transition()
RETURNS trigger AS $$
DECLARE
    _old_status text;
    _new_status text;
BEGIN
    _new_status := NEW.status;

    -- Matches the same trust boundary RLS already grants service_role.
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Admin (or any future role holding jobs.manage_all) keeps full,
    -- unrestricted authority - this trigger never narrows what admin's
    -- existing has_role('admin') RLS branch already allows.
    IF public.has_role('admin') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Non-admin inserts must land as 'draft' and be owned by the caller,
        -- regardless of what the client sends. RLS's job_postings_insert
        -- policy already restricts created_by = auth.uid() for the INSERT to
        -- even be reachable; this adds the status constraint that policy
        -- doesn't express, and defends against a forged created_by too.
        NEW.created_by := auth.uid();
        IF _new_status IS DISTINCT FROM 'draft' THEN
            RAISE EXCEPTION 'Only an admin may create a job posting with status ''%''. New postings must start as draft.', _new_status
                USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    -- TG_OP = 'UPDATE' from here on.
    _old_status := OLD.status;

    -- A mentor may only ever modify their own postings - RLS's USING clause
    -- already enforces this for the row to be reachable at all, but this
    -- trigger re-checks created_by explicitly (defense in depth) and forbids
    -- reassigning ownership to someone else via the UPDATE itself.
    IF OLD.created_by IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'You may only modify your own job postings.' USING ERRCODE = '42501';
    END IF;
    NEW.created_by := OLD.created_by;

    IF _new_status IS NOT DISTINCT FROM _old_status THEN
        -- Ordinary field edits (title/description/package/etc.) to a
        -- posting the mentor already owns - governed purely by RLS
        -- ownership, no extra status rule needed.
        RETURN NEW;
    END IF;

    IF (_old_status, _new_status) IN (
        ('draft', 'under_review'),
        ('under_review', 'draft'),
        ('draft', 'cancelled'),
        ('under_review', 'cancelled'),
        ('open', 'closed'),
        ('closed', 'open'),
        ('closed', 'cancelled'),
        ('open', 'cancelled')
    ) THEN
        RETURN NEW;
    END IF;

    -- Everything else - most importantly draft/under_review -> 'open' - is
    -- exactly the bypass this migration exists to close: a mentor can never
    -- publish their own posting directly, only an admin (via the has_role
    -- branch above) can move a posting into 'open' from draft/under_review.
    RAISE EXCEPTION 'Job posting status cannot be changed from ''%'' to ''%'' by this user. This transition requires admin authority.', _old_status, _new_status
        USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.enforce_job_posting_transition() IS
    'Single source of truth for which job_postings.status transitions each permission tier may perform. Layers on top of (does not replace) job_postings_select/insert/update RLS. SECURITY INVOKER so has_permission()/has_role()/auth.uid() resolve to the calling user.';

DROP TRIGGER IF EXISTS enforce_job_posting_transition ON public.job_postings;
CREATE TRIGGER enforce_job_posting_transition
    BEFORE INSERT OR UPDATE ON public.job_postings
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_job_posting_transition();

-- SECTION 5: notify admins of a new job-posting submission
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admins_job_submitted(p_job_posting_id uuid)
RETURNS void AS $$
DECLARE
    v_job_title text;
    v_mentor_name text;
BEGIN
    SELECT jp.title, p.full_name
    INTO v_job_title, v_mentor_name
    FROM public.job_postings jp
    JOIN public.profiles p ON p.id = jp.created_by
    WHERE jp.id = p_job_posting_id
      AND jp.created_by = auth.uid()
      AND jp.status = 'under_review';

    IF v_job_title IS NULL THEN
        RAISE EXCEPTION 'Job posting % not found, not under review, or not owned by the calling user', p_job_posting_id;
    END IF;

    INSERT INTO public.notifications (recipient_id, title, message, type, is_read, metadata)
    SELECT
        ur.user_id,
        'New job posting awaiting approval',
        format('%s submitted a job posting for review: "%s".', COALESCE(v_mentor_name, 'A mentor'), v_job_title),
        'broadcast',
        false,
        jsonb_build_object('category', 'placement', 'action_url', '/admin/placements?tab=jobs&status=under_review', 'job_posting_id', p_job_posting_id)
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.code = 'admin' AND ur.revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.notify_admins_job_submitted(uuid) IS 'Notifies all admins that the calling mentor submitted a job posting for review. Bypasses the admin-only notifications INSERT policy via SECURITY DEFINER; verifies submission ownership itself.';

GRANT EXECUTE ON FUNCTION public.notify_admins_job_submitted(uuid) TO authenticated;

-- SECTION 6: let the owning mentor see applicants for their own postings
-- ----------------------------------------------------------------------------
-- Additive OR-branch on every existing SELECT policy in the ATS pipeline -
-- the student_id = auth.uid() and has_role('admin') branches are unchanged.
-- interview_feedback is deliberately NOT extended: its own migration
-- explicitly documents interviewer notes as "internal - never shown
-- directly to the student", and that same admin-internal boundary is kept
-- for mentors here (a mentor sees the round's resulting decision via
-- interview_rounds, exactly as a student does, never the raw feedback).
DROP POLICY IF EXISTS "placement_applications_select" ON public.placement_applications;
CREATE POLICY "placement_applications_select" ON public.placement_applications FOR SELECT
    USING (
        student_id = (select auth.uid())
        OR has_role('admin')
        OR EXISTS (
            SELECT 1 FROM public.job_postings jp
            WHERE jp.id = job_posting_id AND jp.created_by = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "application_documents_select" ON public.application_documents;
CREATE POLICY "application_documents_select" ON public.application_documents FOR SELECT
    USING (
        deleted_at IS NULL AND EXISTS (
            SELECT 1 FROM public.placement_applications pa
            JOIN public.job_postings jp ON jp.id = pa.job_posting_id
            WHERE pa.id = application_id
              AND (pa.student_id = (select auth.uid()) OR has_role('admin') OR jp.created_by = (select auth.uid()))
        )
    );

DROP POLICY IF EXISTS "interview_rounds_select" ON public.interview_rounds;
CREATE POLICY "interview_rounds_select" ON public.interview_rounds FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.placement_applications pa
            JOIN public.job_postings jp ON jp.id = pa.job_posting_id
            WHERE pa.id = application_id
              AND (pa.student_id = (select auth.uid()) OR has_role('admin') OR jp.created_by = (select auth.uid()))
        )
    );

DROP POLICY IF EXISTS "placement_offers_select" ON public.placement_offers;
CREATE POLICY "placement_offers_select" ON public.placement_offers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.placement_applications pa
            JOIN public.job_postings jp ON jp.id = pa.job_posting_id
            WHERE pa.id = application_id
              AND (pa.student_id = (select auth.uid()) OR has_role('admin') OR jp.created_by = (select auth.uid()))
        )
    );

DROP POLICY IF EXISTS "placement_status_history_select" ON public.placement_status_history;
CREATE POLICY "placement_status_history_select" ON public.placement_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.placement_applications pa
            JOIN public.job_postings jp ON jp.id = pa.job_posting_id
            WHERE pa.id = application_id
              AND (pa.student_id = (select auth.uid()) OR has_role('admin') OR jp.created_by = (select auth.uid()))
        )
    );
