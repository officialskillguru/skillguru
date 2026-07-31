-- Enterprise Placement Management System (Phase 1 - previously entirely
-- greenfield: no `placements`/`hiring_partners`/`job_postings` table existed
-- anywhere, and both AdminPlacementsPage and the student dashboard nav
-- already honestly disclosed "Feature Not Available" rather than faking it).
--
-- Reuses existing infrastructure rather than duplicating it:
--   - public.meetings          -> interview scheduling (host_id/attendee_id/starts_at/ends_at/meet_url)
--   - public.notifications     -> student-facing status/interview/offer notifications
--   - public.files             -> resumes, supporting documents, offer letters (via storage.service.ts)
--   - public.student_profiles.resume_file_id -> default resume (per-application override still allowed)
-- `public.organizations` was considered for hiring_partners and rejected: it
-- models multi-tenant *platform* clients, not companies that hire students -
-- a different domain concept entirely.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Hiring partners (companies)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.hiring_partners (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    slug            text NOT NULL UNIQUE,
    logo_url        text,
    website_url     text,
    industry        text,
    description     text,
    contact_name    text,
    contact_email   text,
    contact_phone   text,
    -- Nullable, unused today - reserved so a future hiring-partner login
    -- can be wired to this row without a schema change (per explicit
    -- direction: design for it, don't build it yet).
    partner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);

CREATE INDEX idx_hiring_partners_status ON public.hiring_partners(status) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Job postings
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.job_postings (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hiring_partner_id     uuid NOT NULL REFERENCES public.hiring_partners(id) ON DELETE CASCADE,
    title                 text NOT NULL,
    description           text NOT NULL,
    employment_type       text NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'internship', 'contract')),
    location              text,
    is_remote             boolean NOT NULL DEFAULT false,
    min_package           numeric(12, 2),
    max_package           numeric(12, 2),
    currency              text NOT NULL DEFAULT 'INR',
    -- Free-form eligibility (min_cgpa, branches, graduation_year, etc.) -
    -- structured enough to filter/display, without hardcoding a rigid rule
    -- schema this pass has no product spec for.
    eligibility_criteria  jsonb NOT NULL DEFAULT '{}'::jsonb,
    skills_required       text[] NOT NULL DEFAULT '{}',
    openings_count        integer NOT NULL DEFAULT 1 CHECK (openings_count > 0),
    application_deadline  timestamptz,
    status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'cancelled')),
    created_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    deleted_at            timestamptz
);

CREATE INDEX idx_job_postings_partner ON public.job_postings(hiring_partner_id);
CREATE INDEX idx_job_postings_status ON public.job_postings(status) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Placement applications (the pipeline: applied -> ... -> joined)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.placement_applications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id  uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resume_file_id  uuid REFERENCES public.files(id) ON DELETE SET NULL,
    cover_note      text,
    status          text NOT NULL DEFAULT 'applied' CHECK (status IN (
        'applied', 'shortlisted', 'interview_round_1', 'interview_round_2', 'hr_round',
        'selected', 'offer_released', 'joined', 'rejected', 'withdrawn'
    )),
    rejected_reason text,
    applied_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    withdrawn_at    timestamptz,

    CONSTRAINT placement_applications_one_per_student_job UNIQUE (job_posting_id, student_id)
);

CREATE INDEX idx_placement_applications_student ON public.placement_applications(student_id, status);
CREATE INDEX idx_placement_applications_job ON public.placement_applications(job_posting_id, status);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Application documents (resume overrides, cover letters, ID proof, etc.)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.application_documents (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.placement_applications(id) ON DELETE CASCADE,
    file_id        uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    document_type  text NOT NULL DEFAULT 'other' CHECK (document_type IN ('resume', 'cover_letter', 'id_proof', 'other')),
    uploaded_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz
);

CREATE INDEX idx_application_documents_application ON public.application_documents(application_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Interview rounds (scheduling shell reuses public.meetings)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.interview_rounds (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.placement_applications(id) ON DELETE CASCADE,
    meeting_id     uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
    round_number   integer NOT NULL CHECK (round_number > 0),
    round_type     text NOT NULL DEFAULT 'technical' CHECK (round_type IN ('technical', 'hr', 'managerial', 'other')),
    status         text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    decision       text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pass', 'fail', 'pending')),
    scheduled_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT interview_rounds_one_per_application_round UNIQUE (application_id, round_number)
);

CREATE INDEX idx_interview_rounds_application ON public.interview_rounds(application_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Interview feedback (internal - never shown directly to the student)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.interview_feedback (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_round_id uuid NOT NULL REFERENCES public.interview_rounds(id) ON DELETE CASCADE,
    reviewer_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    rating             integer CHECK (rating BETWEEN 1 AND 5),
    strengths          text,
    weaknesses         text,
    notes              text,
    recommendation     text NOT NULL DEFAULT 'hold' CHECK (recommendation IN ('advance', 'reject', 'hold')),
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_feedback_round ON public.interview_feedback(interview_round_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Placement offers
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.placement_offers (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id       uuid NOT NULL UNIQUE REFERENCES public.placement_applications(id) ON DELETE CASCADE,
    offer_letter_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
    package_amount       numeric(12, 2) NOT NULL,
    currency             text NOT NULL DEFAULT 'INR',
    designation          text,
    joining_date         date,
    status               text NOT NULL DEFAULT 'released' CHECK (status IN ('released', 'accepted', 'declined', 'revoked')),
    released_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    released_at          timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Placement status history (audit trail - insert-only)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.placement_status_history (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.placement_applications(id) ON DELETE CASCADE,
    from_status    text,
    to_status      text NOT NULL,
    note           text,
    changed_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_placement_status_history_application ON public.placement_status_history(application_id, changed_at);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Saved jobs (student "wishlist" for job postings - mirrors public.wishlists)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.saved_placements (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_posting_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    created_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT saved_placements_one_per_student_job UNIQUE (student_id, job_posting_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────
CREATE TRIGGER set_updated_at_hiring_partners BEFORE UPDATE ON public.hiring_partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_job_postings BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_placement_applications BEFORE UPDATE ON public.placement_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_interview_rounds BEFORE UPDATE ON public.interview_rounds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_placement_offers BEFORE UPDATE ON public.placement_offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.hiring_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hiring_partners_select" ON public.hiring_partners FOR SELECT
    USING (deleted_at IS NULL OR public.has_role('admin'));
CREATE POLICY "hiring_partners_insert" ON public.hiring_partners FOR INSERT
    WITH CHECK (public.has_role('admin'));
CREATE POLICY "hiring_partners_update" ON public.hiring_partners FOR UPDATE
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "hiring_partners_delete" ON public.hiring_partners FOR DELETE
    USING (public.has_role('admin'));

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_postings_select" ON public.job_postings FOR SELECT
    USING ((status = 'open' AND deleted_at IS NULL) OR public.has_role('admin'));
CREATE POLICY "job_postings_insert" ON public.job_postings FOR INSERT
    WITH CHECK (public.has_role('admin'));
CREATE POLICY "job_postings_update" ON public.job_postings FOR UPDATE
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "job_postings_delete" ON public.job_postings FOR DELETE
    USING (public.has_role('admin'));

ALTER TABLE public.placement_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "placement_applications_select" ON public.placement_applications FOR SELECT
    USING (student_id = (select auth.uid()) OR public.has_role('admin'));
-- No direct INSERT/UPDATE/DELETE policy - every write goes through a
-- SECURITY DEFINER RPC (apply_to_job / withdraw_application /
-- advance_application_stage / schedule_interview_round / release_offer /
-- mark_placement_joined), matching this project's established pattern for
-- privileged cross-cutting writes (see submit_quiz_attempt).

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "application_documents_select" ON public.application_documents FOR SELECT
    USING (
        deleted_at IS NULL AND EXISTS (
            SELECT 1 FROM public.placement_applications pa
            WHERE pa.id = application_id AND (pa.student_id = (select auth.uid()) OR public.has_role('admin'))
        )
    );
CREATE POLICY "application_documents_insert" ON public.application_documents FOR INSERT
    WITH CHECK (
        public.has_role('admin') OR EXISTS (
            SELECT 1 FROM public.placement_applications pa
            WHERE pa.id = application_id AND pa.student_id = (select auth.uid())
        )
    );
CREATE POLICY "application_documents_update" ON public.application_documents FOR UPDATE
    USING (
        public.has_role('admin') OR EXISTS (
            SELECT 1 FROM public.placement_applications pa
            WHERE pa.id = application_id AND pa.student_id = (select auth.uid())
        )
    )
    WITH CHECK (
        public.has_role('admin') OR EXISTS (
            SELECT 1 FROM public.placement_applications pa
            WHERE pa.id = application_id AND pa.student_id = (select auth.uid())
        )
    );

ALTER TABLE public.interview_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interview_rounds_select" ON public.interview_rounds FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.placement_applications pa
            WHERE pa.id = application_id AND (pa.student_id = (select auth.uid()) OR public.has_role('admin'))
        )
    );
-- Writes only via schedule_interview_round / record_interview_feedback RPCs.

ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interview_feedback_select" ON public.interview_feedback FOR SELECT
    USING (public.has_role('admin'));
-- Interviewer notes are admin-internal, never surfaced directly to the
-- student - only the resulting round decision does, via interview_rounds.
-- Writes only via record_interview_feedback RPC.

ALTER TABLE public.placement_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "placement_offers_select" ON public.placement_offers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.placement_applications pa
            WHERE pa.id = application_id AND (pa.student_id = (select auth.uid()) OR public.has_role('admin'))
        )
    );
-- Writes only via release_offer / mark_placement_joined RPCs.

ALTER TABLE public.placement_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "placement_status_history_select" ON public.placement_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.placement_applications pa
            WHERE pa.id = application_id AND (pa.student_id = (select auth.uid()) OR public.has_role('admin'))
        )
    );
-- Insert-only, always via the RPCs above - never edited or deleted.

ALTER TABLE public.saved_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_placements_all" ON public.saved_placements FOR ALL
    USING (student_id = (select auth.uid()))
    WITH CHECK (student_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- RPCs - the only write path for every table above except saved_placements
-- and application_documents (already RLS-safe as plain owner-scoped writes).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_to_job(
    p_job_posting_id uuid,
    p_resume_file_id uuid,
    p_cover_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_application_id uuid;
    v_status text;
    v_deadline timestamptz;
BEGIN
    SELECT status, application_deadline INTO v_status, v_deadline
    FROM public.job_postings WHERE id = p_job_posting_id AND deleted_at IS NULL;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Job posting not found';
    END IF;
    IF v_status <> 'open' THEN
        RAISE EXCEPTION 'This job posting is not accepting applications';
    END IF;
    IF v_deadline IS NOT NULL AND v_deadline < now() THEN
        RAISE EXCEPTION 'The application deadline for this job has passed';
    END IF;
    IF EXISTS (SELECT 1 FROM public.placement_applications WHERE job_posting_id = p_job_posting_id AND student_id = auth.uid()) THEN
        RAISE EXCEPTION 'You have already applied to this job';
    END IF;

    INSERT INTO public.placement_applications (job_posting_id, student_id, resume_file_id, cover_note, status)
    VALUES (p_job_posting_id, auth.uid(), p_resume_file_id, p_cover_note, 'applied')
    RETURNING id INTO v_application_id;

    INSERT INTO public.placement_status_history (application_id, from_status, to_status, changed_by)
    VALUES (v_application_id, NULL, 'applied', auth.uid());

    INSERT INTO public.notifications (recipient_id, type, title, message)
    VALUES (auth.uid(), 'placement', 'Application submitted', 'Your application has been submitted and is now under review.');

    RETURN v_application_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_to_job(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_to_job(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_to_job(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.withdraw_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_student_id uuid;
    v_status text;
BEGIN
    SELECT student_id, status INTO v_student_id, v_status
    FROM public.placement_applications WHERE id = p_application_id;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    IF v_student_id <> auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to withdraw this application';
    END IF;
    IF v_status IN ('withdrawn', 'rejected', 'joined') THEN
        RAISE EXCEPTION 'This application can no longer be withdrawn';
    END IF;

    UPDATE public.placement_applications
    SET status = 'withdrawn', withdrawn_at = now()
    WHERE id = p_application_id;

    INSERT INTO public.placement_status_history (application_id, from_status, to_status, changed_by)
    VALUES (p_application_id, v_status, 'withdrawn', auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_application(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_application(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.withdraw_application(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.advance_application_stage(
    p_application_id uuid,
    p_new_status text,
    p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_old_status text;
    v_student_id uuid;
BEGIN
    IF NOT public.has_role('admin') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    IF p_new_status NOT IN (
        'applied', 'shortlisted', 'interview_round_1', 'interview_round_2', 'hr_round',
        'selected', 'offer_released', 'joined', 'rejected', 'withdrawn'
    ) THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    SELECT status, student_id INTO v_old_status, v_student_id
    FROM public.placement_applications WHERE id = p_application_id;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    UPDATE public.placement_applications
    SET status = p_new_status,
        rejected_reason = CASE WHEN p_new_status = 'rejected' THEN p_note ELSE rejected_reason END
    WHERE id = p_application_id;

    INSERT INTO public.placement_status_history (application_id, from_status, to_status, note, changed_by)
    VALUES (p_application_id, v_old_status, p_new_status, p_note, auth.uid());

    INSERT INTO public.notifications (recipient_id, type, title, message)
    VALUES (v_student_id, 'placement', 'Application status updated', 'Your application status changed to ' || replace(p_new_status, '_', ' ') || '.');
END;
$$;

REVOKE ALL ON FUNCTION public.advance_application_stage(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_application_stage(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.advance_application_stage(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.schedule_interview_round(
    p_application_id uuid,
    p_round_number integer,
    p_round_type text,
    p_starts_at timestamptz,
    p_ends_at timestamptz,
    p_stage_status text,
    p_platform text DEFAULT 'google_meet',
    p_meet_url text DEFAULT NULL,
    p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_student_id uuid;
    v_old_status text;
    v_meeting_id uuid;
    v_round_id uuid;
    v_job_title text;
BEGIN
    IF NOT public.has_role('admin') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT pa.student_id, pa.status, jp.title INTO v_student_id, v_old_status, v_job_title
    FROM public.placement_applications pa
    JOIN public.job_postings jp ON jp.id = pa.job_posting_id
    WHERE pa.id = p_application_id;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    INSERT INTO public.meetings (title, host_id, attendee_id, entity_type, entity_id, starts_at, ends_at, platform, meet_url, status, notes)
    VALUES (
        'Interview: ' || v_job_title || ' (Round ' || p_round_number || ')',
        auth.uid(), v_student_id, 'placement_application', p_application_id,
        p_starts_at, p_ends_at, p_platform, p_meet_url, 'scheduled', p_notes
    )
    RETURNING id INTO v_meeting_id;

    INSERT INTO public.interview_rounds (application_id, meeting_id, round_number, round_type, scheduled_by)
    VALUES (p_application_id, v_meeting_id, p_round_number, p_round_type, auth.uid())
    RETURNING id INTO v_round_id;

    UPDATE public.placement_applications
    SET status = p_stage_status
    WHERE id = p_application_id;

    INSERT INTO public.placement_status_history (application_id, from_status, to_status, note, changed_by)
    VALUES (p_application_id, v_old_status, p_stage_status, 'Interview round ' || p_round_number || ' scheduled', auth.uid());

    INSERT INTO public.notifications (recipient_id, type, title, message)
    VALUES (v_student_id, 'placement', 'Interview scheduled', 'An interview round has been scheduled for your application to ' || v_job_title || '.');

    RETURN v_round_id;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_interview_round(uuid, integer, text, timestamptz, timestamptz, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.schedule_interview_round(uuid, integer, text, timestamptz, timestamptz, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.schedule_interview_round(uuid, integer, text, timestamptz, timestamptz, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_interview_feedback(
    p_interview_round_id uuid,
    p_decision text,
    p_recommendation text DEFAULT 'hold',
    p_rating integer DEFAULT NULL,
    p_strengths text DEFAULT NULL,
    p_weaknesses text DEFAULT NULL,
    p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_feedback_id uuid;
BEGIN
    IF NOT public.has_role('admin') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    IF p_decision NOT IN ('pass', 'fail', 'pending') THEN
        RAISE EXCEPTION 'Invalid decision: %', p_decision;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.interview_rounds WHERE id = p_interview_round_id) THEN
        RAISE EXCEPTION 'Interview round not found';
    END IF;

    INSERT INTO public.interview_feedback (interview_round_id, reviewer_id, rating, strengths, weaknesses, notes, recommendation)
    VALUES (p_interview_round_id, auth.uid(), p_rating, p_strengths, p_weaknesses, p_notes, p_recommendation)
    RETURNING id INTO v_feedback_id;

    UPDATE public.interview_rounds
    SET status = 'completed', decision = p_decision
    WHERE id = p_interview_round_id;

    RETURN v_feedback_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_interview_feedback(uuid, text, text, integer, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_interview_feedback(uuid, text, text, integer, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_interview_feedback(uuid, text, text, integer, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_offer(
    p_application_id uuid,
    p_package_amount numeric,
    p_currency text DEFAULT 'INR',
    p_designation text DEFAULT NULL,
    p_joining_date date DEFAULT NULL,
    p_offer_letter_file_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_student_id uuid;
    v_old_status text;
    v_offer_id uuid;
BEGIN
    IF NOT public.has_role('admin') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT student_id, status INTO v_student_id, v_old_status
    FROM public.placement_applications WHERE id = p_application_id;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    INSERT INTO public.placement_offers (application_id, offer_letter_file_id, package_amount, currency, designation, joining_date, released_by)
    VALUES (p_application_id, p_offer_letter_file_id, p_package_amount, p_currency, p_designation, p_joining_date, auth.uid())
    ON CONFLICT (application_id) DO UPDATE SET
        offer_letter_file_id = EXCLUDED.offer_letter_file_id,
        package_amount = EXCLUDED.package_amount,
        currency = EXCLUDED.currency,
        designation = EXCLUDED.designation,
        joining_date = EXCLUDED.joining_date
    RETURNING id INTO v_offer_id;

    UPDATE public.placement_applications
    SET status = 'offer_released'
    WHERE id = p_application_id;

    INSERT INTO public.placement_status_history (application_id, from_status, to_status, changed_by)
    VALUES (p_application_id, v_old_status, 'offer_released', auth.uid());

    INSERT INTO public.notifications (recipient_id, type, title, message)
    VALUES (v_student_id, 'placement', 'Offer released', 'Congratulations! An offer letter has been released for your application.');

    RETURN v_offer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_offer(uuid, numeric, text, text, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_offer(uuid, numeric, text, text, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.release_offer(uuid, numeric, text, text, date, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_placement_joined(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_student_id uuid;
    v_old_status text;
BEGIN
    IF NOT public.has_role('admin') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT student_id, status INTO v_student_id, v_old_status
    FROM public.placement_applications WHERE id = p_application_id;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    UPDATE public.placement_applications SET status = 'joined' WHERE id = p_application_id;
    UPDATE public.placement_offers SET status = 'accepted' WHERE application_id = p_application_id;

    INSERT INTO public.placement_status_history (application_id, from_status, to_status, changed_by)
    VALUES (p_application_id, v_old_status, 'joined', auth.uid());

    INSERT INTO public.notifications (recipient_id, type, title, message)
    VALUES (v_student_id, 'placement', 'Placement confirmed', 'Your placement has been marked as joined. Congratulations on your new role!');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_placement_joined(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_placement_joined(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_placement_joined(uuid) TO authenticated;
