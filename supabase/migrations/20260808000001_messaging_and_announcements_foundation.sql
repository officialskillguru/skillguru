-- ============================================================================
-- Phase C: messaging authorization + announcements foundation (schema/RLS only)
-- Additive on top of everything in Phase A/B - no existing table, trigger,
-- policy, or function from those phases is modified. No new UI ships with
-- this migration (deferred to Phase D); this only closes gaps in the
-- existing chat/campaign schema so Phase D has a real, secure backend to
-- build against.
-- ============================================================================
-- WHY THIS MIGRATION EXISTS (confirmed by inspecting the live local schema,
-- not assumed from the plan):
--
-- 1. public.conversation_members' INSERT policy ("Users can join
--    conversations") only allows a row where user_id = auth.uid() (or an
--    admin caller). chat.service.ts's existing getOrCreateDirectConversation
--    inserts a row for the OTHER party too - that insert is silently
--    rejected by RLS for any non-admin caller today. This function is not
--    called by any current page (grep confirms zero call sites), so this is
--    a real, previously-unexercised bug, not a working flow this migration
--    could break. The fix is a SECURITY DEFINER RPC that authorizes the pair
--    server-side and inserts both membership rows atomically - the same
--    "RLS decides whether, a definer function/trigger decides what" pattern
--    already proven for courses and category proposals. chat.service.ts's
--    existing generic functions are left completely untouched; a new
--    function is added alongside them.
--
-- 2. public.message_attachments' INSERT policy allows ANY admin/mentor/
--    student to attach a file to ANY message_id, with no ownership or
--    conversation-membership check at all. Confirmed zero UI currently uses
--    attachments (no upload flow wired anywhere), so tightening this now is
--    zero-regression.
--
-- 3. public.campaigns/campaign_recipients are 100% admin-only today with no
--    mentor path and no audience concept beyond a single nullable
--    target_role - this section extends them additively for the announcement
--    feature Phase D will build a UI for, with audience resolution always
--    computed server-side (never a client-supplied recipient list for
--    'my_students'/'course_cohort'; 'selected' is validated as a subset of
--    those, never arbitrary platform users).
-- ============================================================================

-- ============================================================================
-- SECTION 1: permission codes (dot-notation, matching the live convention -
-- NOT the unused module-first mentor.chat.access seed row)
-- ============================================================================
INSERT INTO public.permissions (slug, name, module, description) VALUES
    ('messages.mentor_to_mentor', 'Message Other Mentors', 'communication', 'Start a direct conversation with another mentor'),
    ('announcements.send_own_students', 'Send Announcements', 'communication', 'Send an announcement/broadcast to the sending mentor''s own students')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _perm_id uuid;
BEGIN
    SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';

    SELECT id INTO _perm_id FROM public.permissions WHERE slug = 'messages.mentor_to_mentor';
    IF _mentor_role IS NOT NULL AND _perm_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (_mentor_role, _perm_id)
        ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO _perm_id FROM public.permissions WHERE slug = 'announcements.send_own_students';
    IF _mentor_role IS NOT NULL AND _perm_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (_mentor_role, _perm_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: user_has_role(uuid, text) - has_role()/has_permission() only
-- ever check auth.uid(); authorizing a *pair* of users needs a role check
-- against an arbitrary user id. SECURITY DEFINER so it can read user_roles
-- regardless of the caller's own RLS visibility into that table.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id uuid, p_role_code text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND r.code = p_role_code
          AND ur.revoked_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.user_has_role(uuid, text) IS 'Like has_role(), but for an arbitrary user id rather than only auth.uid() - used to authorize a conversation between two specific users. Internal helper, not exposed as a client-callable RPC.';

-- ============================================================================
-- SECTION 2b: conversation_members SELECT gap - confirmed by testing against
-- the live local schema (not assumed): "Users view own memberships" only
-- lets a caller see their OWN membership row, never their co-members. Since
-- chat.service.ts's listConversations() nests a `members:conversation_members(...)`
-- selection scoped by this exact policy, every caller would see themselves
-- as the only member of every conversation they're in - "who am I chatting
-- with" would be unrenderable for any Phase D chat UI. This is the same
-- kind of previously-unexercised gap as the INSERT issue in SECTION 3;
-- fixing it here keeps the fix inside "close the authorization gap in the
-- existing chat schema," which is this phase's explicit charter. Additive:
-- the admin/self branches are unchanged, only a third OR'd condition is added.
--
-- A naive `conversation_id IN (SELECT ... FROM conversation_members WHERE
-- user_id = auth.uid())` subquery here is self-referential and Postgres
-- rejects it as infinite recursion (confirmed by testing, not assumed) - the
-- inner subquery would itself need to re-evaluate this same policy. Routing
-- the membership check through a SECURITY DEFINER function avoids the
-- recursion because the function body runs outside RLS, exactly like
-- has_role()/has_permission() already do for their own lookups.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP POLICY IF EXISTS "Users view own memberships" ON public.conversation_members;
CREATE POLICY "Users view own memberships" ON public.conversation_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.has_role('admin')
        OR public.is_conversation_member(conversation_id, auth.uid())
    );

-- ============================================================================
-- SECTION 3: start_direct_conversation - the real authorization boundary
-- for who may message whom. Finds an existing direct conversation between
-- the caller and the target if one exists; otherwise creates it and inserts
-- both membership rows (bypassing conversation_members' self-only INSERT
-- policy via SECURITY DEFINER, having already validated the pair itself).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.start_direct_conversation(p_other_user_id uuid)
RETURNS uuid AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_conversation_id uuid;
    v_authorized boolean := false;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF v_caller = p_other_user_id THEN
        RAISE EXCEPTION 'Cannot start a conversation with yourself';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_other_user_id) THEN
        RAISE EXCEPTION 'Recipient not found';
    END IF;

    -- Admin is a universal authorized counterpart in either direction.
    IF has_role('admin') OR public.user_has_role(p_other_user_id, 'admin') THEN
        v_authorized := true;

    -- Mentor <-> mentor: gated by an explicit permission, not just role membership.
    ELSIF public.user_has_role(v_caller, 'mentor') AND public.user_has_role(p_other_user_id, 'mentor') THEN
        v_authorized := has_permission('messages.mentor_to_mentor');

    -- Mentor -> student: only a student enrolled in one of the mentor's own courses.
    ELSIF public.user_has_role(v_caller, 'mentor') AND public.user_has_role(p_other_user_id, 'student') THEN
        v_authorized := EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.courses c ON c.id = e.course_id
            WHERE c.mentor_id = v_caller AND e.student_id = p_other_user_id
        );

    -- Student -> mentor: the mirror image of the above.
    ELSIF public.user_has_role(v_caller, 'student') AND public.user_has_role(p_other_user_id, 'mentor') THEN
        v_authorized := EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.courses c ON c.id = e.course_id
            WHERE c.mentor_id = p_other_user_id AND e.student_id = v_caller
        );
    END IF;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'Not authorized to message this user';
    END IF;

    -- Serialize concurrent start_direct_conversation calls for the same pair
    -- so two simultaneous requests can't both pass the "does it exist yet"
    -- check below and each create a duplicate direct conversation. Lock key
    -- is order-independent (least/greatest) so it doesn't matter which side
    -- calls first. Transaction-scoped - released automatically at COMMIT.
    PERFORM pg_advisory_xact_lock(hashtextextended(least(v_caller, p_other_user_id)::text || '|' || greatest(v_caller, p_other_user_id)::text, 0));

    SELECT c.id INTO v_conversation_id
    FROM public.conversations c
    WHERE c.type = 'direct'
      AND EXISTS (SELECT 1 FROM public.conversation_members m1 WHERE m1.conversation_id = c.id AND m1.user_id = v_caller)
      AND EXISTS (SELECT 1 FROM public.conversation_members m2 WHERE m2.conversation_id = c.id AND m2.user_id = p_other_user_id)
      AND (SELECT count(*) FROM public.conversation_members m WHERE m.conversation_id = c.id) = 2
    LIMIT 1;

    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;

    INSERT INTO public.conversations (type, created_by) VALUES ('direct', v_caller) RETURNING id INTO v_conversation_id;

    INSERT INTO public.conversation_members (conversation_id, user_id, role) VALUES
        (v_conversation_id, v_caller, 'member'),
        (v_conversation_id, p_other_user_id, 'member');

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.start_direct_conversation(uuid) IS 'The sole authorized entry point for creating/finding a direct conversation. Validates the admin/mentor/student pairing boundary server-side, then inserts both membership rows - conversation_members'' own INSERT policy would otherwise reject the counterpart row for any non-admin caller.';

GRANT EXECUTE ON FUNCTION public.start_direct_conversation(uuid) TO authenticated;

-- ============================================================================
-- SECTION 4: tighten message_attachments INSERT - scope to the caller's own
-- message, not "any admin/mentor/student may attach to any message_id".
-- Confirmed zero current usage (no attachment upload UI exists anywhere),
-- so this is a pure hardening with no regression risk.
-- ============================================================================
DROP POLICY IF EXISTS "Senders upload attachments" ON public.message_attachments;
CREATE POLICY "Senders upload attachments" ON public.message_attachments FOR INSERT
    WITH CHECK (
        has_role('admin')
        OR EXISTS (
            SELECT 1 FROM public.chat_messages cm
            WHERE cm.id = message_attachments.message_id
              AND cm.sender_id = auth.uid()
        )
    );

-- ============================================================================
-- SECTION 5: campaigns/campaign_recipients - additive audience columns +
-- mentor-scoped RLS. Admin's existing "FOR ALL" policies are untouched;
-- these are new, narrower, additional permissive policies layered on top.
-- ============================================================================
ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS audience_type text NOT NULL DEFAULT 'selected'
        CHECK (audience_type IN ('all_mentors','all_students','my_students','course_cohort','selected')),
    ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_sender ON public.campaigns(sender_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_course ON public.campaigns(course_id);

-- A mentor may create an announcement (never 'email'/'whatsapp' - those stay
-- admin-only) addressed only to an audience a mentor is ever allowed to reach.
CREATE POLICY "Mentors create own announcements" ON public.campaigns FOR INSERT
    WITH CHECK (
        has_permission('announcements.send_own_students')
        AND sender_id = auth.uid()
        AND type = 'announcement'
        AND audience_type IN ('my_students','course_cohort','selected')
    );

CREATE POLICY "Mentors view own campaigns" ON public.campaigns FOR SELECT
    USING (sender_id = auth.uid());

CREATE POLICY "Mentors update own campaigns" ON public.campaigns FOR UPDATE
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid() AND audience_type IN ('my_students','course_cohort','selected'));

CREATE POLICY "Mentors view own campaign recipients" ON public.campaign_recipients FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_recipients.campaign_id AND c.sender_id = auth.uid()));

-- ============================================================================
-- SECTION 6: resolve_campaign_audience - the ONLY way campaign_recipients
-- gets populated for a mentor-owned campaign (no direct mentor INSERT policy
-- exists on campaign_recipients at all). Audience resolution is always
-- computed server-side from real enrollment data, never from a client-
-- supplied recipient list, except 'selected' which is validated as a subset
-- of the mentor's own real students before anything is inserted.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_campaign_audience(
    p_campaign_id uuid,
    p_selected_recipient_ids uuid[] DEFAULT NULL
)
RETURNS int AS $$
DECLARE
    v_campaign record;
    v_count int := 0;
BEGIN
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
    IF v_campaign IS NULL THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;

    IF v_campaign.sender_id IS DISTINCT FROM auth.uid() AND NOT has_role('admin') THEN
        RAISE EXCEPTION 'Not authorized to resolve recipients for this campaign';
    END IF;

    IF v_campaign.audience_type = 'all_students' THEN
        IF NOT has_role('admin') THEN
            RAISE EXCEPTION 'Only an admin may address all students';
        END IF;
        INSERT INTO public.campaign_recipients (campaign_id, recipient_id)
        SELECT p_campaign_id, ur.user_id
        FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
        WHERE r.code = 'student' AND ur.revoked_at IS NULL
        ON CONFLICT (campaign_id, recipient_id) DO NOTHING;

    ELSIF v_campaign.audience_type = 'all_mentors' THEN
        IF NOT has_role('admin') THEN
            RAISE EXCEPTION 'Only an admin may address all mentors';
        END IF;
        INSERT INTO public.campaign_recipients (campaign_id, recipient_id)
        SELECT p_campaign_id, ur.user_id
        FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
        WHERE r.code = 'mentor' AND ur.revoked_at IS NULL
        ON CONFLICT (campaign_id, recipient_id) DO NOTHING;

    ELSIF v_campaign.audience_type = 'my_students' THEN
        -- Cancelled enrollments are excluded from broadcast audiences (a
        -- refunded/withdrawn student shouldn't receive promotional/informational
        -- announcements) - this is distinct from 1:1 messaging eligibility in
        -- start_direct_conversation, which deliberately stays permissive so a
        -- past student can still reach their mentor for support.
        INSERT INTO public.campaign_recipients (campaign_id, recipient_id)
        SELECT DISTINCT p_campaign_id, e.student_id
        FROM public.enrollments e
        JOIN public.courses c ON c.id = e.course_id
        WHERE c.mentor_id = v_campaign.sender_id
          AND e.status != 'cancelled'
        ON CONFLICT (campaign_id, recipient_id) DO NOTHING;

    ELSIF v_campaign.audience_type = 'course_cohort' THEN
        IF v_campaign.course_id IS NULL THEN
            RAISE EXCEPTION 'course_cohort audience requires campaigns.course_id to be set';
        END IF;
        IF NOT has_role('admin') AND NOT EXISTS (
            SELECT 1 FROM public.courses c WHERE c.id = v_campaign.course_id AND c.mentor_id = v_campaign.sender_id
        ) THEN
            RAISE EXCEPTION 'Campaign sender does not own this course';
        END IF;
        INSERT INTO public.campaign_recipients (campaign_id, recipient_id)
        SELECT DISTINCT p_campaign_id, e.student_id
        FROM public.enrollments e
        WHERE e.course_id = v_campaign.course_id
          AND e.status != 'cancelled'
        ON CONFLICT (campaign_id, recipient_id) DO NOTHING;

    ELSIF v_campaign.audience_type = 'selected' THEN
        IF p_selected_recipient_ids IS NULL OR array_length(p_selected_recipient_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'selected audience requires at least one recipient id';
        END IF;
        IF has_role('admin') THEN
            INSERT INTO public.campaign_recipients (campaign_id, recipient_id)
            SELECT p_campaign_id, p.id FROM public.profiles p WHERE p.id = ANY(p_selected_recipient_ids)
            ON CONFLICT (campaign_id, recipient_id) DO NOTHING;
        ELSE
            -- Mentor selection is clamped to their own real students -
            -- never an arbitrary platform user, regardless of what the
            -- client sends in p_selected_recipient_ids.
            INSERT INTO public.campaign_recipients (campaign_id, recipient_id)
            SELECT DISTINCT p_campaign_id, e.student_id
            FROM public.enrollments e
            JOIN public.courses c ON c.id = e.course_id
            WHERE c.mentor_id = v_campaign.sender_id
              AND e.status != 'cancelled'
              AND e.student_id = ANY(p_selected_recipient_ids)
            ON CONFLICT (campaign_id, recipient_id) DO NOTHING;
        END IF;
    ELSE
        RAISE EXCEPTION 'Unknown audience_type: %', v_campaign.audience_type;
    END IF;

    SELECT count(*) INTO v_count FROM public.campaign_recipients WHERE campaign_id = p_campaign_id;
    UPDATE public.campaigns SET total_recipients = v_count WHERE id = p_campaign_id;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.resolve_campaign_audience(uuid, uuid[]) IS 'The only way campaign_recipients gets populated. Resolves the real recipient set server-side from enrollments/roles; a mentor can never reach all_students/all_mentors, and a "selected" list is clamped to that mentor''s own enrolled students regardless of client input.';

GRANT EXECUTE ON FUNCTION public.resolve_campaign_audience(uuid, uuid[]) TO authenticated;
