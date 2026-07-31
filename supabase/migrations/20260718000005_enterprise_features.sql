-- =============================================================================
-- Migration: 20260718000005_enterprise_features.sql
-- Version:   1.0.0
-- Description:
--   Creates enterprise-grade features: assignments, attendance, live sessions,
--   certificate templates, audit trail, and search infrastructure.
--
-- Dependencies:
--   003_identity.sql (profiles, mentor_profiles)
--   006_content.sql (courses, modules, lessons)
--   20260706000007_learning.sql (enrollments)
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    mentor_id       uuid NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    lesson_id       uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
    title           text NOT NULL,
    description     text,
    instructions    text,
    due_date        timestamptz,
    max_score       numeric(5,2) DEFAULT 100,
    passing_score   numeric(5,2) DEFAULT 50,
    allow_resubmit  boolean NOT NULL DEFAULT true,
    max_attempts    int DEFAULT 3,
    attachment_ids  text[] DEFAULT '{}',
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft','active','closed')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_mentor ON public.assignments(mentor_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.assignments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view course assignments" ON public.assignments FOR SELECT
    USING (
        course_id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid() AND status = 'active')
        OR public.has_role('admin')
        OR public.has_role('mentor')
    );
CREATE POLICY "Mentors manage own assignments" ON public.assignments FOR ALL
    USING (
        mentor_id IN (SELECT id FROM public.mentor_profiles WHERE id = auth.uid())
        OR public.has_role('admin')
    )
    WITH CHECK (
        mentor_id IN (SELECT id FROM public.mentor_profiles WHERE id = auth.uid())
        OR public.has_role('admin')
    );

-- ============================================================================
-- SECTION 2: Assignment Submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         text,
    file_urls       text[] DEFAULT '{}',
    attempt_number  int NOT NULL DEFAULT 1,
    status          text NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('draft','submitted','under_review','graded','resubmit_requested')),
    -- Grading
    score           numeric(5,2),
    feedback        text,
    rubric_scores   jsonb DEFAULT '{}'::jsonb,
    graded_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    graded_at       timestamptz,
    -- Timestamps
    submitted_at    timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.assignment_submissions(status);

DROP TRIGGER IF EXISTS set_updated_at ON public.assignment_submissions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own submissions" ON public.assignment_submissions FOR ALL
    USING (student_id = auth.uid() OR public.has_role('admin') OR public.has_role('mentor'))
    WITH CHECK (student_id = auth.uid() OR public.has_role('admin') OR public.has_role('mentor'));
CREATE POLICY "Mentors grade submissions" ON public.assignment_submissions FOR UPDATE
    USING (
        assignment_id IN (
            SELECT id FROM public.assignments WHERE
            mentor_id IN (SELECT id FROM public.mentor_profiles WHERE id = auth.uid())
        )
        OR public.has_role('admin')
    );

-- ============================================================================
-- SECTION 3: Attendance
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_type    text NOT NULL DEFAULT 'live'
                    CHECK (session_type IN ('live','recorded','offline')),
    session_id      uuid, -- References live_sessions.id or lesson.id
    course_id       uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    marked_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status          text NOT NULL DEFAULT 'present'
                    CHECK (status IN ('present','absent','late','excused')),
    date            date NOT NULL DEFAULT CURRENT_DATE,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON public.attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON public.attendance(student_id, session_id, date);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own attendance" ON public.attendance FOR SELECT
    USING (student_id = auth.uid() OR public.has_role('admin') OR public.has_role('mentor'));
CREATE POLICY "Mentors manage attendance" ON public.attendance FOR ALL
    USING (public.has_role('mentor') OR public.has_role('admin'))
    WITH CHECK (public.has_role('mentor') OR public.has_role('admin'));

-- ============================================================================
-- SECTION 4: Live Sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    mentor_id       uuid NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
    title           text NOT NULL,
    description     text,
    platform        text NOT NULL DEFAULT 'zoom'
                    CHECK (platform IN ('zoom','google_meet','teams','daily','jitsi','custom')),
    meeting_url     text,
    meeting_id      text,
    meeting_password text,
    starts_at       timestamptz NOT NULL,
    ends_at         timestamptz NOT NULL,
    duration_minutes int,
    recording_url   text,
    status          text NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','live','completed','cancelled')),
    max_participants int DEFAULT 100,
    is_recurring    boolean NOT NULL DEFAULT false,
    recurrence_rule text, -- iCal RRULE
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON public.live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_mentor ON public.live_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_starts ON public.live_sessions(starts_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.live_sessions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.live_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view enrolled course sessions" ON public.live_sessions FOR SELECT
    USING (
        course_id IN (SELECT course_id FROM public.enrollments WHERE student_id = auth.uid() AND status = 'active')
        OR public.has_role('admin')
        OR public.has_role('mentor')
    );
CREATE POLICY "Mentors manage own sessions" ON public.live_sessions FOR ALL
    USING (
        mentor_id IN (SELECT id FROM public.mentor_profiles WHERE id = auth.uid())
        OR public.has_role('admin')
    )
    WITH CHECK (
        mentor_id IN (SELECT id FROM public.mentor_profiles WHERE id = auth.uid())
        OR public.has_role('admin')
    );

-- ============================================================================
-- SECTION 5: Certificate Templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certificate_templates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    description     text,
    html_template   text NOT NULL, -- Handlebars/Mustache template
    css_styles      text,
    preview_url     text,
    is_default      boolean NOT NULL DEFAULT false,
    variables       jsonb DEFAULT '[]'::jsonb, -- List of template variables
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one default template
CREATE UNIQUE INDEX IF NOT EXISTS idx_cert_template_default
    ON public.certificate_templates (is_default) WHERE is_default = true;

DROP TRIGGER IF EXISTS set_updated_at ON public.certificate_templates;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.certificate_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend certificates table
ALTER TABLE public.certificates
    ADD COLUMN IF NOT EXISTS template_id    uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS qr_code_url    text,
    ADD COLUMN IF NOT EXISTS share_url      text,
    ADD COLUMN IF NOT EXISTS metadata       jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS issued_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage certificate templates" ON public.certificate_templates FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "All users view templates" ON public.certificate_templates FOR SELECT USING (true);

-- Seed default certificate template
INSERT INTO public.certificate_templates (name, description, html_template, is_default) VALUES (
    'Default Certificate',
    'Standard SkillGuru completion certificate',
    '<!DOCTYPE html><html><head><style>
    body { font-family: Georgia, serif; background: #fff; margin: 0; }
    .certificate { width: 297mm; height: 210mm; border: 8px double #d4af37; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    h1 { color: #1a1a2e; font-size: 48px; margin-bottom: 10px; }
    .subtitle { font-size: 18px; color: #555; }
    .student-name { font-size: 36px; color: #1a1a2e; font-weight: bold; margin: 20px 0; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }
    .course-name { font-size: 24px; color: #333; margin: 15px 0; }
    .date { color: #777; margin-top: 20px; }
    .cert-number { font-size: 12px; color: #999; margin-top: 10px; }
    </style></head>
    <body><div class="certificate">
    <h1>Certificate of Completion</h1>
    <p class="subtitle">This is to certify that</p>
    <div class="student-name">{{studentName}}</div>
    <p class="subtitle">has successfully completed</p>
    <div class="course-name">{{courseName}}</div>
    <p class="date">Issued on {{issueDate}}</p>
    <p class="cert-number">Certificate #{{certificateNumber}}</p>
    </div></body></html>',
    true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 6: Audit Trail (comprehensive action log)
-- ============================================================================
-- Drop old simple audit_logs and recreate with more fields
-- (Keep existing data if table has records)
ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS old_values   jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS new_values   jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS user_agent   text,
    ADD COLUMN IF NOT EXISTS session_id   text;

-- Enhanced audit log insert function
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action text,
    p_entity_type text,
    p_entity_id uuid DEFAULT NULL,
    p_old_values jsonb DEFAULT NULL,
    p_new_values jsonb DEFAULT NULL,
    p_details jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.audit_logs (
        actor_id, action, entity_type, entity_id,
        old_values, new_values, details
    ) VALUES (
        auth.uid(), p_action, p_entity_type, p_entity_id,
        p_old_values, p_new_values, COALESCE(p_details, '{}'::jsonb)
    ) RETURNING id INTO log_id;
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- SECTION 7: Search Index (full-text search across entities)
-- ============================================================================
-- Full-text search on courses
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.update_course_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_course_search ON public.courses;
CREATE TRIGGER trg_course_search
    BEFORE INSERT OR UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.update_course_search_vector();

CREATE INDEX IF NOT EXISTS idx_courses_search ON public.courses USING GIN(search_vector);

-- Full-text search on profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.update_profile_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_search ON public.profiles;
CREATE TRIGGER trg_profile_search
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_search_vector();

CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles USING GIN(search_vector);

-- Global search RPC
CREATE OR REPLACE FUNCTION public.global_search(
    p_query text,
    p_limit int DEFAULT 10
)
RETURNS jsonb AS $$
DECLARE
    result jsonb := '[]'::jsonb;
    courses_results jsonb;
    students_results jsonb;
    mentors_results jsonb;
BEGIN
    -- Search courses
    SELECT jsonb_agg(jsonb_build_object(
        'type', 'course',
        'id', id,
        'title', title,
        'description', LEFT(description, 100),
        'url', '/admin/courses'
    ))
    INTO courses_results
    FROM public.courses
    WHERE search_vector @@ plainto_tsquery('english', p_query)
       OR title ILIKE '%' || p_query || '%'
    LIMIT p_limit;

    -- Search profiles (students/mentors)
    SELECT jsonb_agg(jsonb_build_object(
        'type', 'user',
        'id', id,
        'title', full_name,
        'description', email,
        'url', '/admin/students'
    ))
    INTO students_results
    FROM public.profiles
    WHERE search_vector @@ plainto_tsquery('english', p_query)
       OR full_name ILIKE '%' || p_query || '%'
       OR email ILIKE '%' || p_query || '%'
    LIMIT p_limit;

    RETURN jsonb_build_object(
        'courses', COALESCE(courses_results, '[]'::jsonb),
        'users', COALESCE(students_results, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- SECTION 8: System Health View
-- ============================================================================
CREATE OR REPLACE VIEW public.system_health AS
SELECT
    (SELECT COUNT(*) FROM public.profiles) AS total_users,
    (SELECT COUNT(*) FROM public.courses WHERE status = 'published') AS published_courses,
    (SELECT COUNT(*) FROM public.enrollments WHERE status = 'active') AS active_enrollments,
    (SELECT COUNT(*) FROM public.orders WHERE status = 'created' AND created_at > now() - interval '24 hours') AS pending_orders_24h,
    (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open') AS open_tickets,
    (SELECT COUNT(*) FROM public.notifications WHERE status = 'unread') AS unread_notifications,
    (SELECT COUNT(*) FROM public.webhooks WHERE processed = false) AS unprocessed_webhooks,
    now() AS checked_at;

COMMIT;
