-- =============================================================================
-- Migration: 20260718000008_system_logs_notifications.sql
-- Version:   1.0.0
-- Description:
--   Creates system-wide observability tables: audit_logs, activity_logs, 
--   and notifications. These tables track state changes across all entities.
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Audit Logs
-- ============================================================================
DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE public.audit_logs (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id                uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_id               uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action                  text NOT NULL, -- e.g., 'mentor_created', 'password_reset'
    entity_type             text NOT NULL, -- e.g., 'mentor', 'user_settings', 'course'
    entity_id               uuid,
    old_values              jsonb,
    new_values              jsonb,
    ip_address              inet,
    user_agent              text,
    request_id              text, -- X-Request-ID for correlation
    
    created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT
    USING (public.has_role('super_admin') OR public.has_role('admin'));
-- Insertions should be done via security definer functions or service role


-- ============================================================================
-- SECTION 2: Activity Logs
-- ============================================================================
DROP TABLE IF EXISTS public.activity_logs CASCADE;
CREATE TABLE public.activity_logs (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action                  text NOT NULL, -- e.g., 'login', 'course_created', 'student_assigned'
    description             text,
    metadata                jsonb DEFAULT '{}'::jsonb,
    ip_address              inet,
    
    created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activity" ON public.activity_logs FOR SELECT
    USING (user_id = auth.uid() OR public.has_role('super_admin') OR public.has_role('admin'));
CREATE POLICY "Users log own activity" ON public.activity_logs FOR INSERT
    WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- SECTION 3: Notifications
-- ============================================================================
DROP TABLE IF EXISTS public.notifications CASCADE;
CREATE TABLE public.notifications (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id               uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    type                    text NOT NULL, -- e.g., 'system', 'assignment', 'message', 'alert'
    title                   text NOT NULL,
    message                 text NOT NULL,
    metadata                jsonb DEFAULT '{}'::jsonb,
    is_read                 boolean NOT NULL DEFAULT false,
    read_at                 timestamptz,
    
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.notifications;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT
    USING (recipient_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE
    USING (recipient_id = auth.uid());
-- Only service role should insert notifications generally, but allow admins if necessary
CREATE POLICY "Admins send notifications" ON public.notifications FOR INSERT
    WITH CHECK (public.has_role('super_admin') OR public.has_role('admin'));


COMMIT;
