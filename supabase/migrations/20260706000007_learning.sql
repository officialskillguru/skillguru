-- =============================================================================
-- Migration: 007_learning.sql
-- Version:   1.0.0
-- Description:
--   Creates the Learning Management domain for SkillGuru.
--
--   Tables: enrollments, course_progress, lesson_progress, quizzes,
--           quiz_questions, quiz_options, quiz_attempts, quiz_answers,
--           certificates
--
-- Dependencies:
--   001_extensions.sql
--   002_enums.sql
--   003_identity.sql
--   004_rbac.sql
--   005_files.sql
--   006_content.sql
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ENUM UPDATES
-- ============================================================================
DROP TYPE IF EXISTS public.enrollment_source CASCADE;
CREATE TYPE public.enrollment_source AS ENUM (
    'manual', 'purchase', 'coupon', 'scholarship', 'admin', 'mentor', 'system', 'migration'
);

-- ============================================================================
-- SECTION 2: ENROLLMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          uuid NOT NULL,
    course_id           uuid NOT NULL,
    status              enrollment_status NOT NULL DEFAULT 'active',
    enrollment_source   enrollment_source NOT NULL DEFAULT 'manual',
    granted_by          uuid,
    enrolled_at         timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT enr_student_fk FOREIGN KEY (student_id)
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT enr_course_fk FOREIGN KEY (course_id)
        REFERENCES public.courses(id) ON DELETE CASCADE,
    CONSTRAINT enr_granted_fk FOREIGN KEY (granted_by)
        REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT enr_student_course_unique UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);

DROP TRIGGER IF EXISTS set_updated_at ON public.enrollments;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 3: PROGRESS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.course_progress (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id           uuid NOT NULL UNIQUE,
    completion_percentage   numeric(5,2) NOT NULL DEFAULT 0.00,
    completed_lessons       int NOT NULL DEFAULT 0,
    total_lessons           int NOT NULL DEFAULT 0,
    last_activity_at        timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT cp_enrollment_fk FOREIGN KEY (enrollment_id)
        REFERENCES public.enrollments(id) ON DELETE CASCADE,
    CONSTRAINT cp_pct_check CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

DROP TRIGGER IF EXISTS set_updated_at ON public.course_progress;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.course_progress
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id           uuid NOT NULL,
    lesson_id               uuid NOT NULL,
    status                  progress_status NOT NULL DEFAULT 'not_started',
    video_position_seconds  int DEFAULT 0,
    time_spent_seconds      int DEFAULT 0,
    started_at              timestamptz,
    completed_at            timestamptz,
    last_accessed_at        timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT lp_enrollment_fk FOREIGN KEY (enrollment_id)
        REFERENCES public.enrollments(id) ON DELETE CASCADE,
    CONSTRAINT lp_lesson_fk FOREIGN KEY (lesson_id)
        REFERENCES public.lessons(id) ON DELETE CASCADE,
    CONSTRAINT lp_enrollment_lesson_unique UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lp_enrollment ON public.lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lp_lesson ON public.lesson_progress(lesson_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.lesson_progress;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROGRESS AGGREGATION TRIGGER
CREATE OR REPLACE FUNCTION public.recalculate_course_progress()
RETURNS trigger AS $$
DECLARE
    _enrollment_id uuid;
    _course_id uuid;
    _total_lessons int;
    _completed_lessons int;
    _pct numeric(5,2);
BEGIN
    _enrollment_id := COALESCE(NEW.enrollment_id, OLD.enrollment_id);

    -- Check if enrollment still exists (prevents FK error during cascading deletes)
    IF NOT EXISTS (SELECT 1 FROM public.enrollments WHERE id = _enrollment_id) THEN
        RETURN NULL;
    END IF;

    -- Find the course id for this enrollment
    SELECT course_id INTO _course_id
    FROM public.enrollments
    WHERE id = _enrollment_id;

    -- Count total published lessons in this course
    SELECT COUNT(*) INTO _total_lessons
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE m.course_id = _course_id AND l.deleted_at IS NULL AND m.deleted_at IS NULL;

    -- Count completed lessons for this enrollment
    SELECT COUNT(*) INTO _completed_lessons
    FROM public.lesson_progress
    WHERE enrollment_id = _enrollment_id AND status = 'completed';

    IF _total_lessons > 0 THEN
        _pct := ROUND((_completed_lessons::numeric / _total_lessons::numeric) * 100, 2);
    ELSE
        _pct := 0.00;
    END IF;

    -- Upsert the course progress
    INSERT INTO public.course_progress (enrollment_id, completion_percentage, completed_lessons, total_lessons, last_activity_at)
    VALUES (_enrollment_id, _pct, _completed_lessons, _total_lessons, now())
    ON CONFLICT (enrollment_id) DO UPDATE SET
        completion_percentage = EXCLUDED.completion_percentage,
        completed_lessons = EXCLUDED.completed_lessons,
        total_lessons = EXCLUDED.total_lessons,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = now();

    -- Check if we should mark enrollment as completed
    IF _pct >= 100.00 THEN
        UPDATE public.enrollments SET status = 'completed', completed_at = COALESCE(completed_at, now()) WHERE id = _enrollment_id AND status != 'completed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER update_course_progress
    AFTER INSERT OR UPDATE OF status ON public.lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_course_progress();

CREATE TRIGGER update_course_progress_delete
    AFTER DELETE ON public.lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_course_progress();

-- ============================================================================
-- SECTION 4: QUIZZES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id           uuid NOT NULL,
    module_id           uuid,
    title               text NOT NULL,
    description         text,
    passing_score       int NOT NULL DEFAULT 80,
    is_published        boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    created_by          uuid,
    updated_by          uuid,

    CONSTRAINT qz_course_fk FOREIGN KEY (course_id)
        REFERENCES public.courses(id) ON DELETE CASCADE,
    CONSTRAINT qz_module_fk FOREIGN KEY (module_id)
        REFERENCES public.modules(id) ON DELETE CASCADE,
    CONSTRAINT qz_passing_score_check CHECK (passing_score >= 0 AND passing_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.quizzes;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.quizzes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         uuid NOT NULL,
    question_text   text NOT NULL,
    question_type   question_type NOT NULL DEFAULT 'mcq',
    sort_order      int NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT qq_quiz_fk FOREIGN KEY (quiz_id)
        REFERENCES public.quizzes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qq_quiz_id ON public.quiz_questions(quiz_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.quiz_questions;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.quiz_questions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quiz_options (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     uuid NOT NULL,
    option_text     text NOT NULL,
    is_correct      boolean NOT NULL DEFAULT false,
    sort_order      int NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT qo_question_fk FOREIGN KEY (question_id)
        REFERENCES public.quiz_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qo_question_id ON public.quiz_options(question_id);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id           uuid NOT NULL,
    quiz_id                 uuid NOT NULL,
    attempt_number          int NOT NULL DEFAULT 1,
    score                   numeric(5,2),
    passed                  boolean,
    ai_feedback_generated   boolean DEFAULT false,
    started_at              timestamptz NOT NULL DEFAULT now(),
    submitted_at            timestamptz,
    time_taken_seconds      int,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT qa_enrollment_fk FOREIGN KEY (enrollment_id)
        REFERENCES public.enrollments(id) ON DELETE CASCADE,
    CONSTRAINT qa_quiz_fk FOREIGN KEY (quiz_id)
        REFERENCES public.quizzes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qa_enrollment_id ON public.quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_qa_quiz_id ON public.quiz_attempts(quiz_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.quiz_attempts;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.quiz_attempts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          uuid NOT NULL,
    question_id         uuid NOT NULL,
    selected_option_id  uuid,
    is_correct          boolean,
    answered_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT qans_attempt_fk FOREIGN KEY (attempt_id)
        REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    CONSTRAINT qans_question_fk FOREIGN KEY (question_id)
        REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    CONSTRAINT qans_option_fk FOREIGN KEY (selected_option_id)
        REFERENCES public.quiz_options(id) ON DELETE SET NULL,
    CONSTRAINT qans_attempt_question_unique UNIQUE (attempt_id, question_id)
);

-- ============================================================================
-- SECTION 5: CERTIFICATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certificates (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id       uuid NOT NULL UNIQUE,
    certificate_file_id uuid,
    certificate_number  varchar(64) UNIQUE NOT NULL,
    verification_code   varchar(32) UNIQUE NOT NULL,
    issued_at           timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT cert_enrollment_fk FOREIGN KEY (enrollment_id)
        REFERENCES public.enrollments(id) ON DELETE CASCADE,
    CONSTRAINT cert_file_fk FOREIGN KEY (certificate_file_id)
        REFERENCES public.files(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_certificates_number ON public.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(verification_code);

DROP TRIGGER IF EXISTS set_updated_at ON public.certificates;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.certificates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Admins manage all learning data
CREATE POLICY "Admins manage all enrollments" ON public.enrollments FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Admins manage all course_progress" ON public.course_progress FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Admins manage all lesson_progress" ON public.lesson_progress FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Admins manage all quizzes" ON public.quizzes FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Admins manage all quiz_questions" ON public.quiz_questions FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Admins manage all quiz_options" ON public.quiz_options FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Admins manage all quiz_attempts" ON public.quiz_attempts FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Admins manage all quiz_answers" ON public.quiz_answers FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Admins manage all certificates" ON public.certificates FOR ALL USING (public.has_role('admin'));

-- Enrollments: Mentors view for their courses, Students view own
CREATE POLICY "Mentors can view enrollments for their courses" ON public.enrollments FOR SELECT
USING (public.has_role('mentor') AND course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid()));
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can update own enrollments" ON public.enrollments FOR UPDATE USING (student_id = auth.uid());

-- Progress: Mentors view for their courses, Students manage own
CREATE POLICY "Mentors can view course_progress for their courses" ON public.course_progress FOR SELECT
USING (public.has_role('mentor') AND enrollment_id IN (SELECT id FROM public.enrollments WHERE course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid())));
CREATE POLICY "Students can view own course_progress" ON public.course_progress FOR SELECT USING (enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = auth.uid()));

CREATE POLICY "Mentors can view lesson_progress for their courses" ON public.lesson_progress FOR SELECT
USING (public.has_role('mentor') AND enrollment_id IN (SELECT id FROM public.enrollments WHERE course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid())));
CREATE POLICY "Students can view own lesson_progress" ON public.lesson_progress FOR SELECT USING (enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = auth.uid()));
CREATE POLICY "Students can insert own lesson_progress" ON public.lesson_progress FOR INSERT WITH CHECK (enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = auth.uid()));
CREATE POLICY "Students can update own lesson_progress" ON public.lesson_progress FOR UPDATE USING (enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = auth.uid()));

-- Quizzes: Mentors manage for their courses, Students read published quizzes
CREATE POLICY "Mentors manage own quizzes" ON public.quizzes FOR ALL USING (course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid()));
CREATE POLICY "Students view published quizzes" ON public.quizzes FOR SELECT USING (is_published = true);

CREATE POLICY "Mentors manage own quiz questions" ON public.quiz_questions FOR ALL USING (quiz_id IN (SELECT id FROM public.quizzes WHERE course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid())));
CREATE POLICY "Students view quiz questions" ON public.quiz_questions FOR SELECT USING (quiz_id IN (SELECT id FROM public.quizzes WHERE is_published = true));

CREATE POLICY "Mentors manage own quiz options" ON public.quiz_options FOR ALL USING (question_id IN (SELECT id FROM public.quiz_questions WHERE quiz_id IN (SELECT id FROM public.quizzes WHERE course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid()))));
-- Only select options when enrolled/attempting, but keep it simple for now
CREATE POLICY "Students view quiz options" ON public.quiz_options FOR SELECT USING (question_id IN (SELECT id FROM public.quiz_questions WHERE quiz_id IN (SELECT id FROM public.quizzes WHERE is_published = true)));

-- Quiz Attempts: Mentors view, Students manage own
CREATE POLICY "Mentors view attempts for their courses" ON public.quiz_attempts FOR SELECT USING (quiz_id IN (SELECT id FROM public.quizzes WHERE course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid())));
CREATE POLICY "Students manage own attempts" ON public.quiz_attempts FOR ALL USING (enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = auth.uid()));

CREATE POLICY "Mentors view answers for their courses" ON public.quiz_answers FOR SELECT USING (attempt_id IN (SELECT id FROM public.quiz_attempts WHERE quiz_id IN (SELECT id FROM public.quizzes WHERE course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid()))));
CREATE POLICY "Students manage own answers" ON public.quiz_answers FOR ALL USING (attempt_id IN (SELECT id FROM public.quiz_attempts WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = auth.uid())));

-- Certificates: Publicly readable (verifiable), Mentors view own course, Students manage own
CREATE POLICY "Certificates are publicly viewable" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Mentors can view certificates for their courses" ON public.certificates FOR SELECT USING (enrollment_id IN (SELECT id FROM public.enrollments WHERE course_id IN (SELECT id FROM public.courses WHERE mentor_id = auth.uid())));

COMMIT;
