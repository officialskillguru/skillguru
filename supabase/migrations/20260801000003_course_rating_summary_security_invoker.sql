-- ============================================================================
-- Fix: course_rating_summary was created as a default (definer-security) view,
-- meaning it would run with the view owner's permissions rather than the
-- querying user's, silently bypassing testimonials' own RLS. Recreate with
-- security_invoker = true so it respects the querying user's row access.
-- ============================================================================

DROP VIEW IF EXISTS public.course_rating_summary;

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
