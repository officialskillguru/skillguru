-- Enterprise Mentor Management, Phase 1: account ownership & security controls.
-- Additive only — new nullable/defaulted columns and two new SECURITY DEFINER
-- RPCs. No existing column, table, or policy is dropped or renamed.

BEGIN;

-- ============================================================================
-- SECTION 1: Lock / disable-login columns on mentor_profiles
-- ============================================================================
-- Kept distinct from the existing status ('active'/'suspended') column added by
-- 20260727000003_mentor_status_lifecycle.sql: "suspended" is a business-visible
-- status, "login_disabled" is a security action (admin lock / forced disable)
-- that can be applied independent of, or on top of, suspension.
ALTER TABLE public.mentor_profiles
    ADD COLUMN IF NOT EXISTS login_disabled boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS locked_at       timestamptz,
    ADD COLUMN IF NOT EXISTS locked_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS locked_reason   text;

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_login_disabled ON public.mentor_profiles(login_disabled);

-- ============================================================================
-- SECTION 2: Login history logging RPC
-- ============================================================================
-- Called by the client immediately after a successful sign-in (auth.uid() is
-- only available once a session exists, so failed-attempt logging by user
-- identity isn't possible from the client this way — only successful logins
-- are recorded here; login_history's `success` column stays available for a
-- future server-side failed-attempt hook).
CREATE OR REPLACE FUNCTION public.log_login_event(
    p_user_agent text DEFAULT NULL,
    p_device_type text DEFAULT NULL,
    p_browser text DEFAULT NULL,
    p_os text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.login_history (user_id, user_agent, device_type, browser, os, success)
    VALUES (auth.uid(), p_user_agent, p_device_type, p_browser, p_os, true)
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- SECTION 3: Force-logout RPC (admin-only, revokes real sessions)
-- ============================================================================
-- Deletes the target user's refresh tokens so every existing session is
-- invalidated on next token refresh (the standard way to force a Supabase Auth
-- user out without changing their password). Also closes any open
-- user_sessions rows so the admin UI's "active sessions" list reflects reality
-- immediately rather than waiting for a client heartbeat.
CREATE OR REPLACE FUNCTION public.force_logout_user(p_target_user_id uuid)
RETURNS void AS $$
BEGIN
    IF NOT (public.has_role('admin') OR public.has_role('super_admin')) THEN
        RAISE EXCEPTION 'Only admins can force-logout a user' USING ERRCODE = '42501';
    END IF;

    DELETE FROM auth.refresh_tokens WHERE user_id::text = p_target_user_id::text;

    UPDATE public.user_sessions
    SET is_active = false, ended_at = now()
    WHERE user_id = p_target_user_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMIT;
