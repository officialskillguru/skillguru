-- Phase 9: extend the existing messaging authorization RPCs with Counsellor branches.
-- Additive: every existing authorized pair (admin<->anyone, mentor<->mentor,
-- mentor<->own-enrolled-student) keeps working exactly as before.
-- New: Counsellor<->Mentor (gated on messages.counsellor_access, granted to the
-- counsellor role in the Phase 1 migration). Counsellor<->Admin is already covered by
-- the existing "either party is admin" branch, so no change needed there.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.
--
-- NOTE: superseded immediately by 20260902110006_fix_start_direct_conversation_role_priority_bug.sql
-- (a pre-existing correctness bug was found and fixed during live verification of this change —
-- see that migration's header). Kept here for historical accuracy of what was actually applied.

CREATE OR REPLACE FUNCTION public.list_authorized_message_recipients()
 RETURNS TABLE(id uuid, full_name text, email text, role text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    SELECT p.id, p.full_name, p.email, 'admin'::text
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.code = 'admin'

    UNION

    SELECT p.id, p.full_name, p.email, 'mentor'::text
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.code = 'mentor'
    WHERE p.id != v_caller
      AND public.user_has_role(v_caller, 'mentor')
      AND has_permission('messages.mentor_to_mentor')

    UNION

    SELECT p.id, p.full_name, p.email, 'student'::text
    FROM public.profiles p
    JOIN public.enrollments e ON e.student_id = p.id
    JOIN public.courses c ON c.id = e.course_id
    WHERE c.mentor_id = v_caller

    UNION

    SELECT p.id, p.full_name, p.email, 'mentor'::text
    FROM public.profiles p
    JOIN public.courses c ON c.mentor_id = p.id
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE e.student_id = v_caller

    UNION

    -- Counsellor (holding messages.counsellor_access) can message any Mentor.
    SELECT p.id, p.full_name, p.email, 'mentor'::text
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.code = 'mentor'
    WHERE public.user_has_role(v_caller, 'counsellor')
      AND has_permission('messages.counsellor_access')

    UNION

    -- Any Mentor can message any Counsellor (reciprocal of the branch above).
    SELECT p.id, p.full_name, p.email, 'counsellor'::text
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.code = 'counsellor'
    WHERE public.user_has_role(v_caller, 'mentor')

    ORDER BY 4, 2;
END;
$function$;
