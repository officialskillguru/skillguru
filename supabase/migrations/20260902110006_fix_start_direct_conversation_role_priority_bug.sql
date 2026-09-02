-- Bug found during Phase 9 live verification of the Counsellor messaging branches:
-- the ELSIF chain in start_direct_conversation locks onto the FIRST role-pair whose
-- condition matches, even if that branch's check then evaluates to false — so a user
-- holding multiple roles (e.g. a real account that is both student AND counsellor)
-- could be wrongly denied, because an earlier, unrelated branch "claimed" the decision
-- and the chain never reached the branch that would have actually authorized them.
--
-- Repro (run live, inside a rolled-back transaction): grant an existing student account
-- the counsellor role, call start_direct_conversation(<a real mentor id>) as that user —
-- with the old ELSIF chain this raised "Not authorized" even though
-- has_role('counsellor') and has_permission('messages.counsellor_access') both returned
-- true directly, because the account also held 'student', which matched the
-- student->mentor ELSIF branch first and its enrollment check failed.
--
-- Fix: independent `IF NOT v_authorized AND ...` checks instead of ELSIF, so every valid
-- role pairing for a multi-role user is actually considered, not just the first match.
-- Regression-tested: admin<->anyone, mentor<->mentor (with and without permission),
-- mentor<->enrolled-student, and the new counsellor<->mentor pairing all verified live.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.

CREATE OR REPLACE FUNCTION public.start_direct_conversation(p_other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

    IF has_role('admin') OR public.user_has_role(p_other_user_id, 'admin') THEN
        v_authorized := true;
    END IF;

    IF NOT v_authorized AND public.user_has_role(v_caller, 'mentor') AND public.user_has_role(p_other_user_id, 'mentor') THEN
        v_authorized := has_permission('messages.mentor_to_mentor');
    END IF;

    IF NOT v_authorized AND public.user_has_role(v_caller, 'mentor') AND public.user_has_role(p_other_user_id, 'student') THEN
        v_authorized := EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.courses c ON c.id = e.course_id
            WHERE c.mentor_id = v_caller AND e.student_id = p_other_user_id
        );
    END IF;

    IF NOT v_authorized AND public.user_has_role(v_caller, 'student') AND public.user_has_role(p_other_user_id, 'mentor') THEN
        v_authorized := EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.courses c ON c.id = e.course_id
            WHERE c.mentor_id = p_other_user_id AND e.student_id = v_caller
        );
    END IF;

    IF NOT v_authorized AND public.user_has_role(v_caller, 'counsellor') AND public.user_has_role(p_other_user_id, 'mentor') THEN
        v_authorized := has_permission('messages.counsellor_access');
    END IF;

    IF NOT v_authorized AND public.user_has_role(v_caller, 'mentor') AND public.user_has_role(p_other_user_id, 'counsellor') THEN
        v_authorized := true;
    END IF;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'Not authorized to message this user';
    END IF;

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
$function$;
