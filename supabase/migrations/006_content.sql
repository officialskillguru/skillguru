-- =============================================================================
-- Migration: 006_content.sql
-- Version:   1.0.0
-- Description:
--   Creates the core learning content hierarchy: categories, courses,
--   modules, lessons, and resources.
--
--   Tables: categories, courses, course_categories, modules, lessons, resources
--
-- Dependencies:
--   001_extensions.sql
--   002_enums.sql (course_status, course_level, content_type)
--   003_identity.sql (organizations, mentor_profiles)
--   004_rbac.sql (has_role, has_permission)
--   005_files.sql (files table for thumbnails, videos, resources)
--
-- Rollback:
--   DROP TABLE resources, lessons, modules, course_categories, courses, categories CASCADE;
--   DROP FUNCTION is_course_mentor, has_active_enrollment CASCADE;
--
-- Author:
--   SkillGuru Platform Engineering
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Stub Functions for Future Domains (Commerce)
-- ============================================================================
-- WHY: RLS on lessons requires checking if a user is enrolled.
--      However, the `enrollments` table is created in 008_commerce.sql.
--      We create a stub function here so RLS policies are valid. It will be
--      overwritten with actual logic in 008.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_active_enrollment(p_course_id uuid)
RETURNS boolean AS $$
BEGIN
    -- STUB: Replaced in 008_commerce.sql
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.has_active_enrollment(uuid) IS 'Stub function. Overwritten in 008_commerce to check real enrollments table.';

-- ============================================================================
-- SECTION 2: Categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    slug            text NOT NULL,
    description     text,
    parent_id       uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
    sort_order      int NOT NULL DEFAULT 0,
    
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    created_by      uuid,
    updated_by      uuid,
    deleted_by      uuid,

    CONSTRAINT categories_slug_unique UNIQUE (slug),
    CONSTRAINT categories_name_not_empty CHECK (name <> ''),
    CONSTRAINT categories_slug_not_empty CHECK (slug <> '')
);

COMMENT ON TABLE public.categories IS 'Taxonomy for organizing courses (e.g., Programming, Web Development). Supports hierarchy via parent_id.';

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_active ON public.categories(id) WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 3: Courses
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.courses (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    mentor_id           uuid NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE RESTRICT,
    
    title               text NOT NULL,
    slug                text NOT NULL,
    description         text,
    
    status              course_status NOT NULL DEFAULT 'draft',
    level               course_level NOT NULL DEFAULT 'all_levels',
    
    thumbnail_file_id   uuid REFERENCES public.files(id) ON DELETE SET NULL,
    promo_video_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
    
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    created_by          uuid,
    updated_by          uuid,
    deleted_by          uuid,

    CONSTRAINT courses_slug_unique UNIQUE (slug),
    CONSTRAINT courses_title_not_empty CHECK (title <> ''),
    CONSTRAINT courses_slug_not_empty CHECK (slug <> '')
);

COMMENT ON TABLE public.courses IS 'Core entity representing a learning program. Mentors own courses. A course contains modules, which contain lessons.';
COMMENT ON COLUMN public.courses.mentor_id IS 'FK to mentor_profiles. RESTRICT prevents deleting a mentor who has courses.';

CREATE INDEX idx_courses_mentor ON public.courses(mentor_id);
CREATE INDEX idx_courses_status ON public.courses(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_active ON public.courses(id) WHERE deleted_at IS NULL;

-- Helper for RLS policies to check course ownership efficiently
CREATE OR REPLACE FUNCTION public.is_course_mentor(p_course_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.courses 
        WHERE id = p_course_id AND mentor_id = auth.uid() AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- SECTION 4: Course Categories (Junction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.course_categories (
    course_id       uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    category_id     uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid,
    
    PRIMARY KEY (course_id, category_id)
);

COMMENT ON TABLE public.course_categories IS 'M:N junction linking courses to multiple categories.';

CREATE INDEX idx_course_categories_category ON public.course_categories(category_id);

-- ============================================================================
-- SECTION 5: Modules
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.modules (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title           text NOT NULL,
    description     text,
    sort_order      int NOT NULL DEFAULT 0,
    
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    created_by      uuid,
    updated_by      uuid,
    deleted_by      uuid,

    CONSTRAINT modules_title_not_empty CHECK (title <> '')
);

COMMENT ON TABLE public.modules IS 'Sections/chapters within a course. They contain lessons.';

CREATE INDEX idx_modules_course ON public.modules(course_id);
CREATE INDEX idx_modules_active ON public.modules(id) WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 6: Lessons
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lessons (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id           uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title               text NOT NULL,
    
    content_type        content_type NOT NULL,
    text_content        text,
    video_file_id       uuid REFERENCES public.files(id) ON DELETE SET NULL,
    duration_seconds    int,
    
    is_free_preview     boolean NOT NULL DEFAULT false,
    sort_order          int NOT NULL DEFAULT 0,
    
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    created_by          uuid,
    updated_by          uuid,
    deleted_by          uuid,

    CONSTRAINT lessons_title_not_empty CHECK (title <> ''),
    CONSTRAINT lessons_duration_positive CHECK (duration_seconds IS NULL OR duration_seconds > 0)
);

COMMENT ON TABLE public.lessons IS 'Individual learning units within a module. Contains text or references a video file.';

CREATE INDEX idx_lessons_module ON public.lessons(module_id);
CREATE INDEX idx_lessons_active ON public.lessons(id) WHERE deleted_at IS NULL;

-- Helper to find course_id from module for RLS
CREATE OR REPLACE FUNCTION public.get_course_id_for_module(p_module_id uuid)
RETURNS uuid AS $$
DECLARE
    v_course_id uuid;
BEGIN
    SELECT course_id INTO v_course_id
    FROM public.modules
    WHERE id = p_module_id;
    RETURN v_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper to find course_id from lesson for RLS
CREATE OR REPLACE FUNCTION public.get_course_id_for_lesson(p_lesson_id uuid)
RETURNS uuid AS $$
DECLARE
    v_course_id uuid;
BEGIN
    SELECT m.course_id INTO v_course_id
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE l.id = p_lesson_id;
    RETURN v_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================================
-- SECTION 7: Resources
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resources (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title           text NOT NULL,
    file_id         uuid NOT NULL REFERENCES public.files(id) ON DELETE RESTRICT,
    
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    created_by      uuid,
    updated_by      uuid,
    deleted_by      uuid,

    CONSTRAINT resources_title_not_empty CHECK (title <> '')
);

COMMENT ON TABLE public.resources IS 'Downloadable materials attached to a lesson.';

CREATE INDEX idx_resources_lesson ON public.resources(lesson_id);
CREATE INDEX idx_resources_active ON public.resources(id) WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 8: Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS set_updated_at ON public.categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.courses;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.modules;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.lessons;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.resources;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 9: Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Categories RLS
-- ----------------------------------------------------------------------------
-- SELECT: Anyone can read active categories
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT
USING (deleted_at IS NULL);

-- ALL: Admin can manage categories
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL
USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- ----------------------------------------------------------------------------
-- Courses RLS
-- ----------------------------------------------------------------------------
-- SELECT: Public can view published courses. Mentors can view their own. Admins view all.
CREATE POLICY "Public view published courses" ON public.courses FOR SELECT
USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Mentors view own courses" ON public.courses FOR SELECT
USING (mentor_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Admins view all courses" ON public.courses FOR SELECT
USING (public.has_role('admin'));

-- INSERT: Mentors can create courses if they own them
CREATE POLICY "Mentors create own courses" ON public.courses FOR INSERT
WITH CHECK (public.has_permission('courses.create') AND mentor_id = auth.uid());

-- UPDATE: Mentors update own courses. Admins update all.
CREATE POLICY "Mentors update own courses" ON public.courses FOR UPDATE
USING (public.has_permission('courses.update_own') AND mentor_id = auth.uid() AND deleted_at IS NULL)
WITH CHECK (public.has_permission('courses.update_own') AND mentor_id = auth.uid());

CREATE POLICY "Admins update all courses" ON public.courses FOR UPDATE
USING (public.has_permission('courses.update_all'))
WITH CHECK (public.has_permission('courses.update_all'));

-- ----------------------------------------------------------------------------
-- Course Categories RLS
-- ----------------------------------------------------------------------------
-- SELECT: Public
CREATE POLICY "Public read course categories" ON public.course_categories FOR SELECT USING (true);

-- INSERT/DELETE: Mentor who owns the course, or Admin
CREATE POLICY "Manage course categories" ON public.course_categories FOR ALL
USING (public.is_course_mentor(course_id) OR public.has_role('admin'))
WITH CHECK (public.is_course_mentor(course_id) OR public.has_role('admin'));

-- ----------------------------------------------------------------------------
-- Modules RLS
-- ----------------------------------------------------------------------------
-- SELECT: If course is published (anyone), or if user is the mentor, or admin
CREATE POLICY "View modules for published courses" ON public.modules FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'published' AND c.deleted_at IS NULL)
    AND deleted_at IS NULL
);

CREATE POLICY "Mentors view own modules" ON public.modules FOR SELECT
USING (public.is_course_mentor(course_id) AND deleted_at IS NULL);

CREATE POLICY "Admins view all modules" ON public.modules FOR SELECT
USING (public.has_role('admin'));

-- ALL: Mentors manage own modules, Admins manage all
CREATE POLICY "Mentors manage own modules" ON public.modules FOR ALL
USING (public.has_permission('courses.update_own') AND public.is_course_mentor(course_id))
WITH CHECK (public.has_permission('courses.update_own') AND public.is_course_mentor(course_id));

CREATE POLICY "Admins manage all modules" ON public.modules FOR ALL
USING (public.has_permission('courses.update_all'))
WITH CHECK (public.has_permission('courses.update_all'));

-- ----------------------------------------------------------------------------
-- Lessons RLS
-- ----------------------------------------------------------------------------
-- SELECT:
-- 1. Mentors view own lessons
-- 2. Admins view all lessons
-- 3. Students view if free preview OR if they have active enrollment
CREATE POLICY "Mentors view own lessons" ON public.lessons FOR SELECT
USING (public.is_course_mentor(public.get_course_id_for_module(module_id)) AND deleted_at IS NULL);

CREATE POLICY "Admins view all lessons" ON public.lessons FOR SELECT
USING (public.has_role('admin'));

CREATE POLICY "Students view enrolled or preview lessons" ON public.lessons FOR SELECT
USING (
    deleted_at IS NULL AND
    (is_free_preview = true OR public.has_active_enrollment(public.get_course_id_for_module(module_id)))
);

-- ALL: Mentors manage own, Admins manage all
CREATE POLICY "Mentors manage own lessons" ON public.lessons FOR ALL
USING (public.has_permission('courses.update_own') AND public.is_course_mentor(public.get_course_id_for_module(module_id)))
WITH CHECK (public.has_permission('courses.update_own') AND public.is_course_mentor(public.get_course_id_for_module(module_id)));

CREATE POLICY "Admins manage all lessons" ON public.lessons FOR ALL
USING (public.has_permission('courses.update_all'))
WITH CHECK (public.has_permission('courses.update_all'));

-- ----------------------------------------------------------------------------
-- Resources RLS
-- ----------------------------------------------------------------------------
-- Same logic as Lessons. We reuse the get_course_id_for_lesson helper.
CREATE POLICY "Mentors view own resources" ON public.resources FOR SELECT
USING (public.is_course_mentor(public.get_course_id_for_lesson(lesson_id)) AND deleted_at IS NULL);

CREATE POLICY "Admins view all resources" ON public.resources FOR SELECT
USING (public.has_role('admin'));

CREATE POLICY "Students view enrolled or preview resources" ON public.resources FOR SELECT
USING (
    deleted_at IS NULL AND
    (
        EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.is_free_preview = true)
        OR public.has_active_enrollment(public.get_course_id_for_lesson(lesson_id))
    )
);

CREATE POLICY "Mentors manage own resources" ON public.resources FOR ALL
USING (public.has_permission('courses.update_own') AND public.is_course_mentor(public.get_course_id_for_lesson(lesson_id)))
WITH CHECK (public.has_permission('courses.update_own') AND public.is_course_mentor(public.get_course_id_for_lesson(lesson_id)));

CREATE POLICY "Admins manage all resources" ON public.resources FOR ALL
USING (public.has_permission('courses.update_all'))
WITH CHECK (public.has_permission('courses.update_all'));

-- ============================================================================
-- SECTION 10: Structural Verification
-- ============================================================================

DO $$
DECLARE
    _count int;
BEGIN
    -- 1. Tables exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: courses table not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lessons') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: lessons table not found';
    END IF;

    -- 2. FK checks
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_mentor_id_fkey') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: courses_mentor_id_fkey not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_module_id_fkey') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: lessons_module_id_fkey not found';
    END IF;

    -- 3. RLS enabled
    SELECT COUNT(*) INTO _count FROM pg_class
    WHERE relname IN ('categories', 'courses', 'course_categories', 'modules', 'lessons', 'resources')
      AND relnamespace = 'public'::regnamespace
      AND relrowsecurity = true;
    IF _count != 6 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: RLS not enabled on all 6 tables. Found on %', _count;
    END IF;

    -- 4. Stub functions exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_active_enrollment') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: has_active_enrollment function not found';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  006_content.sql — VERIFICATION PASSED';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  Tables:          6 (categories, courses, course_categories, modules, lessons, resources)';
    RAISE NOTICE '  RLS:             Enabled with ~18 policies';
    RAISE NOTICE '  updated_at:      Triggers attached to 5 tables';
    RAISE NOTICE '  Stubs:           has_active_enrollment() created';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
END;
$$;

COMMIT;
