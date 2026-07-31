-- =============================================================================
-- Migration: 20260718000006_user_management.sql
-- Version:   1.0.0
-- Description:
--   Creates core user management tables required for the enterprise LMS/CRM.
--   Includes user_settings, user_statistics, and user_sessions.
--   Enforces UUIDs, timestamps, active flags, soft deletes, and RLS policies.
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: User Settings
-- ============================================================================
DROP TABLE IF EXISTS public.user_settings CASCADE;
CREATE TABLE public.user_settings (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    password_reset_required boolean NOT NULL DEFAULT false,
    timezone                text NOT NULL DEFAULT 'UTC',
    language                text NOT NULL DEFAULT 'en',
    theme                   text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    notification_prefs      jsonb NOT NULL DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    
    -- Enterprise Tracking Columns
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.user_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own settings" ON public.user_settings FOR SELECT
    USING (user_id = auth.uid() OR public.has_role('admin') OR public.has_role('super_admin'));
CREATE POLICY "Users manage own settings" ON public.user_settings FOR UPDATE
    USING (user_id = auth.uid() OR public.has_role('admin') OR public.has_role('super_admin'));


-- ============================================================================
-- SECTION 2: User Statistics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_statistics (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- Mentor specific stats (can be genericized)
    total_students          int NOT NULL DEFAULT 0,
    active_students         int NOT NULL DEFAULT 0,
    completed_courses       int NOT NULL DEFAULT 0,
    average_rating          numeric(3,2) NOT NULL DEFAULT 0.00,
    assignments_checked     int NOT NULL DEFAULT 0,
    
    -- Student specific stats
    courses_enrolled        int NOT NULL DEFAULT 0,
    courses_completed       int NOT NULL DEFAULT 0,
    total_study_minutes     int NOT NULL DEFAULT 0,
    
    -- Enterprise Tracking Columns
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON public.user_statistics(user_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.user_statistics;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_statistics
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own statistics" ON public.user_statistics FOR SELECT
    USING (user_id = auth.uid() OR public.has_role('admin') OR public.has_role('mentor') OR public.has_role('super_admin'));


-- ============================================================================
-- SECTION 3: User Sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_info             text,
    ip_address              inet,
    user_agent              text,
    started_at              timestamptz NOT NULL DEFAULT now(),
    ended_at                timestamptz,
    is_active               boolean NOT NULL DEFAULT true,
    
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);

DROP TRIGGER IF EXISTS set_updated_at ON public.user_sessions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sessions" ON public.user_sessions FOR SELECT
    USING (user_id = auth.uid() OR public.has_role('admin') OR public.has_role('super_admin'));
CREATE POLICY "Admins manage sessions" ON public.user_sessions FOR ALL
    USING (public.has_role('admin') OR public.has_role('super_admin'));


COMMIT;
