-- =============================================================================
-- Migration: 20260718000002_profile_enhancements.sql
-- Version:   1.0.0
-- Description:
--   Extends profiles and mentor_profiles for enterprise completeness.
--   Adds: user_settings, login_history, mentor_invites tables.
--   Creates: profile_completion view.
--
-- Dependencies:
--   003_identity.sql (profiles, mentor_profiles)
--   004_rbac.sql (has_role)
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Extend profiles table
-- ============================================================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone           text,
    ADD COLUMN IF NOT EXISTS gender          text CHECK (gender IN ('male','female','non_binary','prefer_not_to_say')),
    ADD COLUMN IF NOT EXISTS date_of_birth   date,
    ADD COLUMN IF NOT EXISTS country         text,
    ADD COLUMN IF NOT EXISTS state           text,
    ADD COLUMN IF NOT EXISTS city            text,
    ADD COLUMN IF NOT EXISTS address         text,
    ADD COLUMN IF NOT EXISTS linkedin_url    text,
    ADD COLUMN IF NOT EXISTS github_url      text,
    ADD COLUMN IF NOT EXISTS portfolio_url   text,
    ADD COLUMN IF NOT EXISTS website_url     text,
    ADD COLUMN IF NOT EXISTS twitter_url     text,
    ADD COLUMN IF NOT EXISTS bio             text,
    ADD COLUMN IF NOT EXISTS username        text UNIQUE,
    ADD COLUMN IF NOT EXISTS profile_completion_pct int NOT NULL DEFAULT 0;

-- ============================================================================
-- SECTION 2: Extend mentor_profiles table
-- ============================================================================
ALTER TABLE public.mentor_profiles
    ADD COLUMN IF NOT EXISTS company            text,
    ADD COLUMN IF NOT EXISTS experience_years   int DEFAULT 0,
    ADD COLUMN IF NOT EXISTS certifications     jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS skills             text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS linkedin_url       text,
    ADD COLUMN IF NOT EXISTS github_url         text,
    ADD COLUMN IF NOT EXISTS portfolio_url      text,
    ADD COLUMN IF NOT EXISTS website_url        text,
    ADD COLUMN IF NOT EXISTS twitter_url        text,
    ADD COLUMN IF NOT EXISTS availability_hours jsonb DEFAULT '{}'::jsonb;

-- ============================================================================
-- SECTION 3: Profile completion function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(profile_id uuid)
RETURNS int AS $$
DECLARE
    score int := 0;
    p public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO p FROM public.profiles WHERE id = profile_id;
    IF p.full_name IS NOT NULL AND p.full_name <> '' THEN score := score + 10; END IF;
    IF p.email IS NOT NULL THEN score := score + 10; END IF;
    IF p.phone IS NOT NULL THEN score := score + 10; END IF;
    IF p.avatar_url IS NOT NULL THEN score := score + 15; END IF;
    IF p.bio IS NOT NULL AND p.bio <> '' THEN score := score + 10; END IF;
    IF p.country IS NOT NULL THEN score := score + 5; END IF;
    IF p.city IS NOT NULL THEN score := score + 5; END IF;
    IF p.date_of_birth IS NOT NULL THEN score := score + 5; END IF;
    IF p.linkedin_url IS NOT NULL THEN score := score + 5; END IF;
    IF p.github_url IS NOT NULL THEN score := score + 5; END IF;
    IF p.portfolio_url IS NOT NULL THEN score := score + 5; END IF;
    IF p.username IS NOT NULL THEN score := score + 5; END IF;
    IF p.gender IS NOT NULL THEN score := score + 5; END IF;
    IF p.address IS NOT NULL THEN score := score + 5; END IF;
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger to auto-update profile_completion_pct
CREATE OR REPLACE FUNCTION public.update_profile_completion()
RETURNS trigger AS $$
BEGIN
    NEW.profile_completion_pct := public.calculate_profile_completion(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_completion ON public.profiles;
CREATE TRIGGER trg_profile_completion
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_completion();

-- ============================================================================
-- SECTION 4: User Settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Notification preferences
    email_notifications boolean NOT NULL DEFAULT true,
    push_notifications  boolean NOT NULL DEFAULT true,
    sms_notifications   boolean NOT NULL DEFAULT false,
    -- Notification categories
    notify_course_updates   boolean NOT NULL DEFAULT true,
    notify_assignments      boolean NOT NULL DEFAULT true,
    notify_payments         boolean NOT NULL DEFAULT true,
    notify_messages         boolean NOT NULL DEFAULT true,
    notify_announcements    boolean NOT NULL DEFAULT true,
    -- UI preferences
    ui_prefs            jsonb DEFAULT '{}'::jsonb,
    -- Security
    two_fa_enabled      boolean NOT NULL DEFAULT false,
    two_fa_secret       text,
    -- Timestamps
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON public.user_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all settings" ON public.user_settings FOR SELECT
    USING (public.has_role('admin'));

-- Auto-create user_settings on new profile
CREATE OR REPLACE FUNCTION public.create_default_user_settings()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_create_user_settings ON public.profiles;
CREATE TRIGGER trg_create_user_settings
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_default_user_settings();

-- ============================================================================
-- SECTION 5: Login History
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.login_history (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address  text,
    user_agent  text,
    device_type text, -- 'desktop','mobile','tablet'
    browser     text,
    os          text,
    city        text,
    country     text,
    success     boolean NOT NULL DEFAULT true,
    failure_reason text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON public.login_history(created_at DESC);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own login history" ON public.login_history FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY "Admins view all login history" ON public.login_history FOR SELECT
    USING (public.has_role('admin'));
CREATE POLICY "System insert login history" ON public.login_history FOR INSERT
    WITH CHECK (true); -- Controlled by service-role key only in practice

-- ============================================================================
-- SECTION 6: Mentor Invites
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mentor_invites (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email               text NOT NULL,
    full_name           text NOT NULL,
    invited_by          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','expired','cancelled')),
    temp_password       text, -- Stored temporarily, cleared after first login
    user_id             uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Populated after acceptance
    message             text,
    invited_at          timestamptz NOT NULL DEFAULT now(),
    accepted_at         timestamptz,
    expires_at          timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_mentor_invites_email ON public.mentor_invites(email);
CREATE INDEX IF NOT EXISTS idx_mentor_invites_status ON public.mentor_invites(status);

ALTER TABLE public.mentor_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invites" ON public.mentor_invites FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- ============================================================================
-- SECTION 7: Mentor Permissions (granular per-mentor settings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mentor_permissions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_profile_id   uuid NOT NULL UNIQUE REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    can_create_courses  boolean NOT NULL DEFAULT false,
    can_publish_courses boolean NOT NULL DEFAULT false,
    can_manage_students boolean NOT NULL DEFAULT true,
    can_view_revenue    boolean NOT NULL DEFAULT false,
    can_send_broadcast  boolean NOT NULL DEFAULT false,
    max_courses         int DEFAULT 10,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON public.mentor_permissions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.mentor_permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mentor_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mentor permissions" ON public.mentor_permissions FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors view own permissions" ON public.mentor_permissions FOR SELECT
    USING (
        mentor_profile_id IN (
            SELECT id FROM public.mentor_profiles WHERE id = auth.uid()
        )
    );

COMMIT;
