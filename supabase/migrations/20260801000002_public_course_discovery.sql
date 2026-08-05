-- ============================================================================
-- Public Course Discovery: additive columns/tables for the public navbar,
-- /courses catalogue, and course-detail page, plus a security fix.
-- ============================================================================

-- SECTION 1: New nullable/defaulted courses columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS short_description text,
    ADD COLUMN IF NOT EXISTS what_you_will_learn text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS requirements text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'English',
    ADD COLUMN IF NOT EXISTS discount_price numeric,
    ADD COLUMN IF NOT EXISTS course_type text;

COMMENT ON COLUMN public.courses.short_description IS 'One-line marketing summary shown on course cards.';
COMMENT ON COLUMN public.courses.what_you_will_learn IS 'Bullet list of learning outcomes shown on the course detail page.';
COMMENT ON COLUMN public.courses.requirements IS 'Bullet list of prerequisites shown on the course detail page.';
COMMENT ON COLUMN public.courses.discount_price IS 'Optional discounted price. When set and lower than price, the detail/card UI shows a strikethrough on price.';
COMMENT ON COLUMN public.courses.course_type IS 'Free-text mentor/admin-set descriptor (e.g. Bootcamp, Self-Paced). No enum - values are whatever mentors/admins have used so far.';

-- SECTION 2: course_media (gallery images, placement images/videos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_media (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id    uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    file_id      uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    media_type   text NOT NULL CHECK (media_type IN ('gallery_image', 'placement_image', 'placement_video')),
    caption      text,
    sort_order   int NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    created_by   uuid
);

COMMENT ON TABLE public.course_media IS 'Marketing/placement media attached to a course - gallery images and placement images/videos. Modeled on the lessons "resources" attachment pattern.';

CREATE INDEX IF NOT EXISTS idx_course_media_course ON public.course_media(course_id);

ALTER TABLE public.course_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_media_select" ON public.course_media FOR SELECT
USING (
    has_role('admin')
    OR is_course_mentor(course_id)
    OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_media.course_id AND c.status = 'published' AND c.deleted_at IS NULL
    )
);

CREATE POLICY "course_media_insert" ON public.course_media FOR INSERT
WITH CHECK (has_permission('courses.update_all') OR (has_permission('courses.update_own') AND is_course_mentor(course_id)));

CREATE POLICY "course_media_update" ON public.course_media FOR UPDATE
USING (has_permission('courses.update_all') OR (has_permission('courses.update_own') AND is_course_mentor(course_id)))
WITH CHECK (has_permission('courses.update_all') OR (has_permission('courses.update_own') AND is_course_mentor(course_id)));

CREATE POLICY "course_media_delete" ON public.course_media FOR DELETE
USING (has_permission('courses.update_all') OR (has_permission('courses.update_own') AND is_course_mentor(course_id)));

-- SECTION 3: course_faqs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_faqs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id    uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    question     text NOT NULL,
    answer       text NOT NULL,
    sort_order   int NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_faqs_course ON public.course_faqs(course_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.course_faqs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.course_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_faqs_select" ON public.course_faqs FOR SELECT
USING (
    has_role('admin')
    OR is_course_mentor(course_id)
    OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_faqs.course_id AND c.status = 'published' AND c.deleted_at IS NULL
    )
);

CREATE POLICY "course_faqs_insert" ON public.course_faqs FOR INSERT
WITH CHECK (has_permission('courses.update_all') OR (has_permission('courses.update_own') AND is_course_mentor(course_id)));

CREATE POLICY "course_faqs_update" ON public.course_faqs FOR UPDATE
USING (has_permission('courses.update_all') OR (has_permission('courses.update_own') AND is_course_mentor(course_id)))
WITH CHECK (has_permission('courses.update_all') OR (has_permission('courses.update_own') AND is_course_mentor(course_id)));

CREATE POLICY "course_faqs_delete" ON public.course_faqs FOR DELETE
USING (has_permission('courses.update_all') OR (has_permission('courses.update_own') AND is_course_mentor(course_id)));

-- SECTION 4: Link success_stories to a course (optional)
-- ----------------------------------------------------------------------------
ALTER TABLE public.success_stories
    ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_success_stories_course ON public.success_stories(course_id);

COMMENT ON COLUMN public.success_stories.course_id IS 'Optional link so a success story can be shown on a specific course''s Placement & Career Outcomes section. NULL = sitewide story, unrelated to any single course.';

-- SECTION 5: course_rating_summary view
-- ----------------------------------------------------------------------------
CREATE VIEW public.course_rating_summary
WITH (security_invoker = true) AS
SELECT
    course_id,
    round(avg(rating)::numeric, 2) AS avg_rating,
    count(*) AS review_count
FROM public.testimonials
WHERE is_approved = true AND course_id IS NOT NULL AND rating IS NOT NULL
GROUP BY course_id;

COMMENT ON VIEW public.course_rating_summary IS 'Computed on read from approved testimonials - no stored/trigger-maintained aggregate column on courses. security_invoker=true so it respects the querying user''s RLS, not the view owner''s.';

-- SECTION 6: Security fix - lessons/resources public SELECT must also check
-- the parent course is published, not just is_free_preview/enrollment.
-- Without this, a free-preview lesson (or its resources) of a draft/
-- under_review/archived course is publicly readable.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS consolidated_select ON public.lessons;
CREATE POLICY consolidated_select ON public.lessons FOR SELECT
USING (
    has_permission('courses.update_all')
    OR (has_permission('courses.update_own') AND is_course_mentor(get_course_id_for_module(module_id)))
    OR (
        has_role('admin')
        OR (is_course_mentor(get_course_id_for_module(module_id)) AND deleted_at IS NULL)
        OR (
            deleted_at IS NULL
            AND (
                (
                    is_free_preview = true
                    AND EXISTS (
                        SELECT 1 FROM public.courses c
                        WHERE c.id = get_course_id_for_module(module_id)
                          AND c.status = 'published' AND c.deleted_at IS NULL
                    )
                )
                OR has_active_enrollment(get_course_id_for_module(module_id))
            )
        )
    )
);

DROP POLICY IF EXISTS consolidated_select ON public.resources;
CREATE POLICY consolidated_select ON public.resources FOR SELECT
USING (
    has_permission('courses.update_all')
    OR (has_permission('courses.update_own') AND is_course_mentor(get_course_id_for_lesson(lesson_id)))
    OR (
        has_role('admin')
        OR (is_course_mentor(get_course_id_for_lesson(lesson_id)) AND deleted_at IS NULL)
        OR (
            deleted_at IS NULL
            AND (
                (
                    EXISTS (
                        SELECT 1 FROM public.lessons l
                        WHERE l.id = resources.lesson_id AND l.is_free_preview = true
                    )
                    AND EXISTS (
                        SELECT 1 FROM public.courses c
                        WHERE c.id = get_course_id_for_lesson(lesson_id)
                          AND c.status = 'published' AND c.deleted_at IS NULL
                    )
                )
                OR has_active_enrollment(get_course_id_for_lesson(lesson_id))
            )
        )
    )
);
