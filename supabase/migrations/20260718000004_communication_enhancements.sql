-- =============================================================================
-- Migration: 20260718000004_communication_enhancements.sql
-- Version:   1.0.0
-- Description:
--   Replaces simple messages table with full conversation-based chat system.
--   Enhances notifications with categories, metadata, and preferences.
--
-- Dependencies:
--   003_identity.sql (profiles)
--   20260706000011_platform_features.sql (messages, notifications)
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Conversations (replaces simple messages)
-- ============================================================================
-- Drop old simple messages if exists (they were basic sender/receiver)
-- We keep existing messages table but add conversations layer on top

CREATE TABLE IF NOT EXISTS public.conversations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type        text NOT NULL DEFAULT 'direct'
                CHECK (type IN ('direct','group','broadcast','announcement')),
    title       text, -- For group/broadcast chats
    description text,
    created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_archived boolean NOT NULL DEFAULT false,
    metadata    jsonb DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON public.conversations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 2: Conversation Members
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role                text NOT NULL DEFAULT 'member'
                        CHECK (role IN ('admin','member')),
    joined_at           timestamptz NOT NULL DEFAULT now(),
    last_read_at        timestamptz,
    is_muted            boolean NOT NULL DEFAULT false,
    UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);

-- ============================================================================
-- SECTION 3: Chat Messages (new structured table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         text NOT NULL,
    message_type    text NOT NULL DEFAULT 'text'
                    CHECK (message_type IN ('text','image','file','video','audio','system')),
    reply_to_id     uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    is_deleted      boolean NOT NULL DEFAULT false,
    is_edited       boolean NOT NULL DEFAULT false,
    metadata        jsonb DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.chat_messages;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 4: Message Attachments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    file_name       text NOT NULL,
    file_size       bigint,
    file_type       text NOT NULL, -- MIME type
    storage_path    text NOT NULL,
    url             text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_attachments_message ON public.message_attachments(message_id);

-- ============================================================================
-- SECTION 5: RLS for chat
-- ============================================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Conversations: visible to members
CREATE POLICY "Members view their conversations" ON public.conversations FOR SELECT
    USING (
        id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
        OR public.has_role('admin')
    );
CREATE POLICY "Users create conversations" ON public.conversations FOR INSERT
    WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins manage conversations" ON public.conversations FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- Members: manage own membership
CREATE POLICY "Users view own memberships" ON public.conversation_members FOR SELECT
    USING (user_id = auth.uid() OR public.has_role('admin'));
CREATE POLICY "Admins manage all memberships" ON public.conversation_members FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Users can join conversations" ON public.conversation_members FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.has_role('admin'));

-- Messages: visible to conversation members
CREATE POLICY "Members view conversation messages" ON public.chat_messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
        )
        OR public.has_role('admin')
    );
CREATE POLICY "Members send messages" ON public.chat_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
        )
    );
CREATE POLICY "Senders edit own messages" ON public.chat_messages FOR UPDATE
    USING (sender_id = auth.uid() OR public.has_role('admin'));

-- Attachments
CREATE POLICY "Message members view attachments" ON public.message_attachments FOR SELECT
    USING (
        message_id IN (
            SELECT cm.id FROM public.chat_messages cm
            JOIN public.conversation_members cvm ON cvm.conversation_id = cm.conversation_id
            WHERE cvm.user_id = auth.uid()
        )
        OR public.has_role('admin')
    );
CREATE POLICY "Senders upload attachments" ON public.message_attachments FOR INSERT
    WITH CHECK (public.has_role('admin') OR public.has_role('mentor') OR public.has_role('student'));

-- ============================================================================
-- SECTION 6: Enhance notifications table
-- ============================================================================
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS category      text DEFAULT 'general'
                                           CHECK (category IN ('course','payment','message',
                                                               'assignment','certificate','system','general')),
    ADD COLUMN IF NOT EXISTS action_url    text,
    ADD COLUMN IF NOT EXISTS read_at       timestamptz,
    ADD COLUMN IF NOT EXISTS metadata      jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS sender_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON public.notifications(recipient_id) WHERE status = 'unread';

-- ============================================================================
-- SECTION 7: Notification Preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Channels
    email_enabled       boolean NOT NULL DEFAULT true,
    in_app_enabled      boolean NOT NULL DEFAULT true,
    -- Categories
    course_updates      boolean NOT NULL DEFAULT true,
    assignment_alerts   boolean NOT NULL DEFAULT true,
    payment_alerts      boolean NOT NULL DEFAULT true,
    chat_messages       boolean NOT NULL DEFAULT true,
    announcements       boolean NOT NULL DEFAULT true,
    certificate_alerts  boolean NOT NULL DEFAULT true,
    system_alerts       boolean NOT NULL DEFAULT true,
    -- Timestamps
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON public.notification_preferences;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Auto-create notification_preferences on new profile
CREATE OR REPLACE FUNCTION public.create_default_notification_prefs()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_create_notification_prefs ON public.profiles;
CREATE TRIGGER trg_create_notification_prefs
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_prefs();

-- ============================================================================
-- SECTION 8: Helper function to get unread notification count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid DEFAULT auth.uid())
RETURNS int AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::int
        FROM public.notifications
        WHERE recipient_id = p_user_id AND status = 'unread'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMIT;
