-- ============================================================================
-- notify_admins_course_submitted
-- ============================================================================
-- WHY: The "notifications" table's INSERT RLS policy ("Admins send
--      notifications") only allows admin/super_admin callers. A mentor
--      submitting a course for review has no way to insert a notification
--      row for admins under that policy - the client-side broadcast call
--      was silently no-op'ing (RLS violation errors are swallowed by
--      notificationsService.broadcastNotification's per-batch try/catch).
--
-- WHAT: A SECURITY DEFINER RPC mentors can call after flipping a course to
--       under_review. It re-derives the course title/mentor name itself
--       (does not trust client-supplied text for notification content) and
--       verifies the caller actually owns the course before fanning the
--       notification out to every admin.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_admins_course_submitted(p_course_id uuid)
RETURNS void AS $$
DECLARE
    v_course_title text;
    v_mentor_name text;
BEGIN
    SELECT c.title, p.full_name
    INTO v_course_title, v_mentor_name
    FROM public.courses c
    JOIN public.profiles p ON p.id = c.mentor_id
    WHERE c.id = p_course_id
      AND c.mentor_id = auth.uid();

    IF v_course_title IS NULL THEN
        RAISE EXCEPTION 'Course % not found or not owned by the calling mentor', p_course_id;
    END IF;

    INSERT INTO public.notifications (recipient_id, title, message, type, is_read, metadata)
    SELECT
        ur.user_id,
        'Course submitted for review',
        format('%s submitted "%s" for review.', COALESCE(v_mentor_name, 'A mentor'), v_course_title),
        'broadcast',
        false,
        jsonb_build_object('category', 'course', 'action_url', '/admin/courses?status=under_review')
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.code = 'admin' AND ur.revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.notify_admins_course_submitted(uuid) IS 'Notifies all admins that the calling mentor submitted a course for review. Bypasses the admin-only notifications INSERT policy via SECURITY DEFINER; verifies course ownership itself.';

GRANT EXECUTE ON FUNCTION public.notify_admins_course_submitted(uuid) TO authenticated;
