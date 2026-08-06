-- ============================================================================
-- Phase D support: authorized recipient directory for the "New Message" UI.
-- ============================================================================
-- WHY: profiles' SELECT RLS is self-only (plus admin ALL) - a mentor cannot
-- query any other user's name/role via a plain table select, so a "New
-- Message" recipient search has literally no data source without this. This
-- mirrors the exact same pairing-authorization matrix as
-- start_direct_conversation (20260808000001) so the recipient list a caller
-- sees is never wider than who they're actually allowed to message - the
-- frontend still can't be trusted to filter correctly, so this list IS the
-- authority, not a convenience cache of it. start_direct_conversation
-- independently re-validates the pair regardless of what this returns.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_authorized_message_recipients()
RETURNS TABLE(id uuid, full_name text, email text, role text)
AS $$
DECLARE
    v_caller uuid := auth.uid();
BEGIN
    IF v_caller IS NULL THEN
        RETURN;
    END IF;

    IF has_role('admin') THEN
        RETURN QUERY
        SELECT p.id, p.full_name, p.email, r.code
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.id AND ur.revoked_at IS NULL
        JOIN public.roles r ON r.id = ur.role_id
        WHERE p.id != v_caller
        ORDER BY r.code, p.full_name;
        RETURN;
    END IF;

    RETURN QUERY
    -- Admins are always a reachable counterpart.
    SELECT p.id, p.full_name, p.email, 'admin'::text
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.code = 'admin'

    UNION

    -- Mentor <-> mentor, only if the caller holds the permission (mirrors
    -- start_direct_conversation's own check exactly).
    SELECT p.id, p.full_name, p.email, 'mentor'::text
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.code = 'mentor'
    WHERE p.id != v_caller
      AND public.user_has_role(v_caller, 'mentor')
      AND has_permission('messages.mentor_to_mentor')

    UNION

    -- The caller's own enrolled students (mentor caller).
    SELECT p.id, p.full_name, p.email, 'student'::text
    FROM public.profiles p
    JOIN public.enrollments e ON e.student_id = p.id
    JOIN public.courses c ON c.id = e.course_id
    WHERE c.mentor_id = v_caller

    UNION

    -- The caller's own mentors, i.e. mentors of courses the caller is
    -- enrolled in (student caller).
    SELECT p.id, p.full_name, p.email, 'mentor'::text
    FROM public.profiles p
    JOIN public.courses c ON c.mentor_id = p.id
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE e.student_id = v_caller

    ORDER BY 4, 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp STABLE;

COMMENT ON FUNCTION public.list_authorized_message_recipients() IS 'Server-computed recipient directory for the New Message UI - same authorization matrix as start_direct_conversation. The frontend must not merge in any other recipient source.';

GRANT EXECUTE ON FUNCTION public.list_authorized_message_recipients() TO authenticated;

-- ============================================================================
-- SECTION 2: new-message notifications
-- ============================================================================
-- WHY: notifications' INSERT RLS ("Admins send notifications") is admin-only,
-- so a mentor/student sending a chat message cannot notify the other party
-- directly. SECURITY DEFINER RPC, self-validates the caller is actually a
-- member of the conversation before inserting anything (mirrors
-- notify_admins_category_proposed's self-validating-ownership pattern).
-- Anti-spam: skips inserting if the recipient already has an unread
-- notification for this same conversation (one indicator at a time, not one
-- per message).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_new_message(p_conversation_id uuid, p_message_preview text)
RETURNS void AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_sender_name text;
    r record;
BEGIN
    IF v_caller IS NULL THEN
        RETURN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id AND user_id = v_caller
    ) THEN
        RAISE EXCEPTION 'Not a member of this conversation';
    END IF;

    SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = v_caller;

    FOR r IN
        SELECT cm.user_id FROM public.conversation_members cm
        WHERE cm.conversation_id = p_conversation_id AND cm.user_id != v_caller
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.recipient_id = r.user_id
              AND n.is_read = false
              AND n.metadata->>'conversation_id' = p_conversation_id::text
        ) THEN
            INSERT INTO public.notifications (recipient_id, sender_id, title, message, type, is_read, metadata)
            VALUES (
                r.user_id,
                v_caller,
                'New message',
                format('%s: %s', COALESCE(v_sender_name, 'Someone'), left(p_message_preview, 120)),
                'direct_message',
                false,
                jsonb_build_object('category', 'message', 'conversation_id', p_conversation_id)
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.notify_new_message(uuid, text) IS 'Notifies the other conversation member(s) of a new message. Self-validates the caller is actually a member. Skips if the recipient already has an unread notification for this conversation, to avoid one-notification-per-message spam.';

GRANT EXECUTE ON FUNCTION public.notify_new_message(uuid, text) TO authenticated;
