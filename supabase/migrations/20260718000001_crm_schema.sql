-- =============================================================================
-- Migration: 20260718000001_crm_schema.sql
-- Version:   1.0.0
-- Description:
--   Creates the complete CRM domain for SkillGuru Enterprise.
--
--   Tables: leads, lead_sources, lead_notes, lead_followups, lead_activities,
--           tasks, task_comments, meetings, calendar_events,
--           support_tickets, ticket_messages,
--           pipelines, pipeline_stages, pipeline_items,
--           campaigns, campaign_recipients,
--           student_notes, mentor_notes
--
-- Dependencies:
--   003_identity.sql (profiles)
--   006_content.sql (courses)
--   20260706000007_learning.sql (enrollments)
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Lead Sources (lookup table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_sources (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    slug        text NOT NULL UNIQUE,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.lead_sources (name, slug) VALUES
    ('Website',      'website'),
    ('Referral',     'referral'),
    ('Advertisement','advertisement'),
    ('Social Media', 'social_media'),
    ('WhatsApp',     'whatsapp'),
    ('Phone Call',   'phone_call'),
    ('Walk-in',      'walk_in'),
    ('Campaign',     'campaign'),
    ('Other',        'other')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead sources" ON public.lead_sources FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Public read lead sources" ON public.lead_sources FOR SELECT USING (true);

-- ============================================================================
-- SECTION 2: Leads
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Contact info
    name                    text NOT NULL,
    email                   text,
    phone                   text,
    -- Interest
    course_interest_id      uuid REFERENCES public.courses(id) ON DELETE SET NULL,
    budget                  numeric(10,2),
    -- Source & assignment
    source_id               uuid REFERENCES public.lead_sources(id) ON DELETE SET NULL,
    assigned_mentor_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Status
    status                  text NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new','contacted','qualified','demo_scheduled',
                                              'follow_up','converted','lost','closed')),
    priority                text NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low','medium','high','urgent')),
    -- Tracking
    expected_joining_date   date,
    notes                   text,
    tags                    text[],
    -- Audit
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_mentor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all leads" ON public.leads FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors view assigned leads" ON public.leads FOR SELECT
    USING (assigned_mentor_id = auth.uid() OR public.has_role('admin'));

-- ============================================================================
-- SECTION 3: Lead Notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id     uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     text NOT NULL,
    is_private  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON public.lead_notes(lead_id);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead notes" ON public.lead_notes FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors manage own lead notes" ON public.lead_notes FOR ALL
    USING (author_id = auth.uid() OR public.has_role('admin'))
    WITH CHECK (author_id = auth.uid() OR public.has_role('admin'));

-- ============================================================================
-- SECTION 4: Lead Follow-ups
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_followups (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    assigned_to     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type            text NOT NULL DEFAULT 'call'
                    CHECK (type IN ('call','email','whatsapp','meeting','demo','other')),
    scheduled_at    timestamptz NOT NULL,
    completed_at    timestamptz,
    notes           text,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','completed','cancelled','overdue')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followups_lead ON public.lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_assigned ON public.lead_followups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled ON public.lead_followups(scheduled_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.lead_followups;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lead_followups
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage followups" ON public.lead_followups FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors manage own followups" ON public.lead_followups FOR ALL
    USING (assigned_to = auth.uid() OR public.has_role('admin'))
    WITH CHECK (assigned_to = auth.uid() OR public.has_role('admin'));

-- ============================================================================
-- SECTION 5: Lead Activities (audit trail for leads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id     uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action      text NOT NULL,
    details     jsonb DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead activities" ON public.lead_activities FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors view own lead activities" ON public.lead_activities FOR SELECT
    USING (public.has_role('mentor') OR public.has_role('admin'));

-- ============================================================================
-- SECTION 6: Tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    description     text,
    assignee_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigner_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    entity_type     text, -- 'lead','student','course','general'
    entity_id       uuid,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','completed','cancelled','overdue')),
    priority        text NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
    due_date        timestamptz,
    completed_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date);

DROP TRIGGER IF EXISTS set_updated_at ON public.tasks;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all tasks" ON public.tasks FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors manage own tasks" ON public.tasks FOR ALL
    USING (assignee_id = auth.uid() OR assigner_id = auth.uid() OR public.has_role('admin'))
    WITH CHECK (assignee_id = auth.uid() OR assigner_id = auth.uid() OR public.has_role('admin'));

-- ============================================================================
-- SECTION 7: Task Comments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage task comments" ON public.task_comments FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Users manage own task comments" ON public.task_comments FOR ALL
    USING (author_id = auth.uid() OR public.has_role('admin'))
    WITH CHECK (author_id = auth.uid() OR public.has_role('admin'));

-- ============================================================================
-- SECTION 8: Meetings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meetings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    description     text,
    host_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type     text, -- 'lead','student','group'
    entity_id       uuid,
    starts_at       timestamptz NOT NULL,
    ends_at         timestamptz NOT NULL,
    location        text,
    meet_url        text,
    platform        text DEFAULT 'zoom'
                    CHECK (platform IN ('zoom','google_meet','teams','daily','other')),
    status          text NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','ongoing','completed','cancelled')),
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_host ON public.meetings(host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_starts ON public.meetings(starts_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.meetings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all meetings" ON public.meetings FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors manage own meetings" ON public.meetings FOR ALL
    USING (host_id = auth.uid() OR public.has_role('admin'))
    WITH CHECK (host_id = auth.uid() OR public.has_role('admin'));

-- ============================================================================
-- SECTION 9: Calendar Events
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title           text NOT NULL,
    description     text,
    event_type      text NOT NULL DEFAULT 'general'
                    CHECK (event_type IN ('meeting','class','exam','followup','deadline',
                                         'payment_due','assignment_due','general')),
    starts_at       timestamptz NOT NULL,
    ends_at         timestamptz,
    all_day         boolean NOT NULL DEFAULT false,
    entity_type     text,
    entity_id       uuid,
    color           text DEFAULT '#3B82F6',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_user ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_starts ON public.calendar_events(starts_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.calendar_events;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own events" ON public.calendar_events FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage all events" ON public.calendar_events FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- ============================================================================
-- SECTION 10: Support Tickets
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    category        text NOT NULL DEFAULT 'general'
                    CHECK (category IN ('technical','payment','course','certificate',
                                        'account','general')),
    priority        text NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','critical')),
    status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','pending','resolved','closed')),
    title           text NOT NULL,
    description     text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tickets_student ON public.support_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);

DROP TRIGGER IF EXISTS set_updated_at ON public.support_tickets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own tickets" ON public.support_tickets FOR SELECT
    USING (student_id = auth.uid() OR public.has_role('admin') OR public.has_role('mentor'));
CREATE POLICY "Students create tickets" ON public.support_tickets FOR INSERT
    WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins manage all tickets" ON public.support_tickets FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors update assigned tickets" ON public.support_tickets FOR UPDATE
    USING (assigned_to = auth.uid() OR public.has_role('admin'));

-- ============================================================================
-- SECTION 11: Ticket Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         text NOT NULL,
    is_internal     boolean NOT NULL DEFAULT false, -- internal notes, hidden from student
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ticket participants view messages" ON public.ticket_messages FOR SELECT
    USING (
        author_id = auth.uid() OR
        public.has_role('admin') OR
        ticket_id IN (SELECT id FROM public.support_tickets WHERE student_id = auth.uid())
    );
CREATE POLICY "Ticket participants insert messages" ON public.ticket_messages FOR INSERT
    WITH CHECK (
        author_id = auth.uid() AND (
            public.has_role('admin') OR
            public.has_role('mentor') OR
            ticket_id IN (SELECT id FROM public.support_tickets WHERE student_id = auth.uid())
        )
    );

-- ============================================================================
-- SECTION 12: Sales Pipeline
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipelines (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    description text,
    created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    name        text NOT NULL,
    color       text DEFAULT '#3B82F6',
    position    int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pipeline_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id    uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
    lead_id     uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    position    int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default pipeline
INSERT INTO public.pipelines (name, description) VALUES
    ('Main Sales Pipeline', 'Default admission sales pipeline')
ON CONFLICT DO NOTHING;

-- Seed default stages (done via PL/pgSQL to use the pipeline ID)
DO $$
DECLARE
    pipeline_uuid uuid;
BEGIN
    SELECT id INTO pipeline_uuid FROM public.pipelines WHERE name = 'Main Sales Pipeline' LIMIT 1;
    IF pipeline_uuid IS NOT NULL THEN
        INSERT INTO public.pipeline_stages (pipeline_id, name, color, position) VALUES
            (pipeline_uuid, 'New Lead',        '#6B7280', 0),
            (pipeline_uuid, 'Contacted',       '#3B82F6', 1),
            (pipeline_uuid, 'Interested',      '#8B5CF6', 2),
            (pipeline_uuid, 'Demo Scheduled',  '#F59E0B', 3),
            (pipeline_uuid, 'Negotiation',     '#EF4444', 4),
            (pipeline_uuid, 'Payment Pending', '#F97316', 5),
            (pipeline_uuid, 'Enrolled',        '#10B981', 6),
            (pipeline_uuid, 'Lost',            '#64748B', 7)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pipelines" ON public.pipelines FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors view pipelines" ON public.pipelines FOR SELECT
    USING (public.has_role('mentor') OR public.has_role('admin'));
CREATE POLICY "Admins manage stages" ON public.pipeline_stages FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors view stages" ON public.pipeline_stages FOR SELECT
    USING (public.has_role('mentor') OR public.has_role('admin'));
CREATE POLICY "Admins manage items" ON public.pipeline_items FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors manage own items" ON public.pipeline_items FOR ALL
    USING (public.has_role('mentor') OR public.has_role('admin'))
    WITH CHECK (public.has_role('mentor') OR public.has_role('admin'));

-- ============================================================================
-- SECTION 13: Campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    type            text NOT NULL DEFAULT 'email'
                    CHECK (type IN ('email','announcement','whatsapp')),
    status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
    subject         text,
    body            text NOT NULL,
    sender_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_role     text, -- null = all, 'student', 'mentor'
    scheduled_at    timestamptz,
    sent_at         timestamptz,
    total_recipients int DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    recipient_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','delivered','opened','failed')),
    sent_at         timestamptz,
    opened_at       timestamptz,
    UNIQUE (campaign_id, recipient_id)
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Admins manage campaign recipients" ON public.campaign_recipients FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- ============================================================================
-- SECTION 14: Student & Mentor Notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     text NOT NULL,
    is_private  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student ON public.student_notes(student_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.student_notes;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.student_notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage student notes" ON public.student_notes FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Mentors manage own student notes" ON public.student_notes FOR ALL
    USING (author_id = auth.uid() OR public.has_role('admin'))
    WITH CHECK (author_id = auth.uid() OR public.has_role('admin'));

CREATE TABLE IF NOT EXISTS public.mentor_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mentor notes" ON public.mentor_notes FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

COMMIT;
