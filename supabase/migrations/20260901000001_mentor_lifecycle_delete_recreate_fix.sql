-- ============================================================================
-- Mentor account lifecycle fix: "delete mentor -> recreate with same email ->
-- 409 User already exists" production bug.
--
-- ROOT CAUSE (confirmed against live data, see kirsh3847@gmail.com /
-- secureinstagram440@gmail.com / test.mentor@skillguru.com):
--   softDeleteMentor() only ever set mentor_profiles.deleted_at. It never
--   touched auth.users or public.profiles. create-mentor's duplicate-email
--   precheck queries public.profiles.email with no regard for
--   mentor_profiles.deleted_at, so a soft-deleted mentor's still-live
--   profiles row (by original design - soft delete preserves courses/
--   history/audit trail) permanently blocks recreation with the same email,
--   and returns an opaque generic "User already exists" 409 with no
--   actionable next step. Additionally, login_disabled stayed false on
--   soft-deleted mentors, so a "deleted" mentor's auth.users session could
--   still be used to sign in - deletion never actually revoked access.
--
-- This migration does NOT delete any auth identity and does NOT touch
-- existing production rows. It adds:
--   1. Two SECURITY DEFINER RPCs (admin_soft_delete_mentor /
--      admin_restore_mentor) that atomically flip deleted_at + login_disabled
--      + revoke active sessions together, so "deleted" actually means
--      "cannot log in" (previously these were two separate, unsynchronized
--      client-side writes).
--   2. A tracking column so restore only re-enables login if THIS delete
--      disabled it (an admin's separate manual lock is never silently
--      cleared by a restore).
--   3. A public.assert_login_allowed() RPC called right after sign-in to
--      close the "deleted/locked mentor can still authenticate" gap -
--      SECURITY DEFINER so it can read mentor_profiles regardless of RLS,
--      and safe to call for any authenticated user (non-mentors simply have
--      no mentor_profiles row and pass through).
-- ============================================================================

BEGIN;

ALTER TABLE public.mentor_profiles
    ADD COLUMN IF NOT EXISTS login_disabled_by_deletion boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.mentor_profiles.login_disabled_by_deletion IS
    'True when login_disabled was set by admin_soft_delete_mentor() rather than an explicit admin lock. Lets admin_restore_mentor() re-enable login without clobbering a separate manual lock.';

-- ----------------------------------------------------------------------------
-- admin_soft_delete_mentor: the only supported way to delete a mentor.
-- Preserves all business history (courses, enrollments, reviews, messages)
-- by design - only flips visibility/login flags. Revokes active sessions so
-- the mentor cannot continue using an existing session after deletion.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_soft_delete_mentor(p_mentor_id uuid)
RETURNS void AS $$
DECLARE
    v_already_deleted timestamptz;
BEGIN
    IF NOT (public.has_role('admin') OR public.has_role('super_admin')) THEN
        RAISE EXCEPTION 'Only admins can delete a mentor' USING ERRCODE = '42501';
    END IF;

    SELECT deleted_at INTO v_already_deleted FROM public.mentor_profiles WHERE id = p_mentor_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mentor not found' USING ERRCODE = 'P0002';
    END IF;
    IF v_already_deleted IS NOT NULL THEN
        RETURN; -- idempotent: already deleted, nothing to do
    END IF;

    UPDATE public.mentor_profiles
    SET deleted_at = now(),
        login_disabled = true,
        login_disabled_by_deletion = NOT login_disabled, -- don't claim ownership of a pre-existing manual lock
        locked_at = COALESCE(locked_at, now()),
        locked_by = COALESCE(locked_by, auth.uid())
    WHERE id = p_mentor_id;

    DELETE FROM auth.refresh_tokens WHERE user_id::text = p_mentor_id::text;
    UPDATE public.user_sessions SET is_active = false, ended_at = now()
    WHERE user_id = p_mentor_id AND is_active = true;

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'mentor_deleted', 'mentor_profile', p_mentor_id, jsonb_build_object('deleted_at', now()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.admin_soft_delete_mentor(uuid) IS
    'Admin-only soft delete: preserves courses/history, blocks login, revokes sessions. Never touches auth.users.';

-- ----------------------------------------------------------------------------
-- admin_restore_mentor: reverses admin_soft_delete_mentor. Only re-enables
-- login if this restore is undoing THIS delete's lock, not a separate admin
-- lock that predates or was applied independently.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_restore_mentor(p_mentor_id uuid)
RETURNS void AS $$
BEGIN
    IF NOT (public.has_role('admin') OR public.has_role('super_admin')) THEN
        RAISE EXCEPTION 'Only admins can restore a mentor' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.mentor_profiles WHERE id = p_mentor_id) THEN
        RAISE EXCEPTION 'Mentor not found' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.mentor_profiles
    SET deleted_at = NULL,
        login_disabled = CASE WHEN login_disabled_by_deletion THEN false ELSE login_disabled END,
        locked_at = CASE WHEN login_disabled_by_deletion THEN NULL ELSE locked_at END,
        locked_by = CASE WHEN login_disabled_by_deletion THEN NULL ELSE locked_by END,
        locked_reason = CASE WHEN login_disabled_by_deletion THEN NULL ELSE locked_reason END,
        login_disabled_by_deletion = false
    WHERE id = p_mentor_id;

    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'mentor_restored', 'mentor_profile', p_mentor_id, jsonb_build_object('deleted_at', null));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.admin_restore_mentor(uuid) IS
    'Admin-only restore: clears deleted_at and re-enables login unless the mentor was separately admin-locked.';

-- ----------------------------------------------------------------------------
-- assert_login_allowed: closes the gap where a locked/deleted mentor's
-- existing credentials could still complete signInWithPassword() (nothing
-- previously checked login_disabled/deleted_at at authentication time - only
-- the admin UI hid the mentor and force_logout_user() revoked tokens
-- on-demand, which doesn't cover a fresh password sign-in afterwards).
-- Called by the client immediately after a successful sign-in; if it raises,
-- the client signs the session back out.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_login_allowed()
RETURNS void AS $$
DECLARE
    v_disabled boolean;
    v_deleted timestamptz;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
    END IF;

    SELECT login_disabled, deleted_at INTO v_disabled, v_deleted
    FROM public.mentor_profiles WHERE id = auth.uid();

    IF NOT FOUND THEN
        RETURN; -- not a mentor account - nothing to enforce here
    END IF;

    IF v_deleted IS NOT NULL OR v_disabled THEN
        RAISE EXCEPTION 'This account has been disabled by an administrator.' USING ERRCODE = '42501';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.assert_login_allowed() IS
    'Call immediately after sign-in. Raises if the authenticated mentor is soft-deleted or login_disabled; no-op for non-mentor accounts.';

GRANT EXECUTE ON FUNCTION public.admin_soft_delete_mentor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_mentor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_login_allowed() TO authenticated;

COMMIT;
