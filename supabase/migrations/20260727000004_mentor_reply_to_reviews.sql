-- Real "reply to reviews" capability for mentors (Phase 1 mentor-module gap).
-- Additive columns on the existing `testimonials` table - no new duplicate
-- reviews table. Writes are routed through a SECURITY DEFINER RPC rather than
-- a broad RLS UPDATE policy, so a mentor can only ever touch the reply fields
-- (never the student's rating/content) without needing column-level GRANT
-- surgery on a role also used by the existing "Admins manage testimonials"
-- policy.

ALTER TABLE public.testimonials
    ADD COLUMN IF NOT EXISTS mentor_reply text,
    ADD COLUMN IF NOT EXISTS mentor_replied_at timestamptz;

CREATE OR REPLACE FUNCTION public.reply_to_testimonial(p_testimonial_id uuid, p_reply text)
RETURNS public.testimonials
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_course_id uuid;
    v_result public.testimonials;
BEGIN
    IF p_reply IS NULL OR length(trim(p_reply)) = 0 THEN
        RAISE EXCEPTION 'Reply cannot be empty';
    END IF;
    IF length(p_reply) > 2000 THEN
        RAISE EXCEPTION 'Reply is too long (max 2000 characters)';
    END IF;

    SELECT course_id INTO v_course_id FROM public.testimonials WHERE id = p_testimonial_id;
    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Review not found';
    END IF;

    IF NOT (public.has_role('admin') OR public.is_course_mentor(v_course_id)) THEN
        RAISE EXCEPTION 'Not authorized to reply to this review';
    END IF;

    UPDATE public.testimonials
    SET mentor_reply = trim(p_reply), mentor_replied_at = now()
    WHERE id = p_testimonial_id
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reply_to_testimonial(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reply_to_testimonial(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reply_to_testimonial(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.reply_to_testimonial IS
    'Lets a course''s mentor (or an admin) reply to a real student testimonial. Only ever writes mentor_reply/mentor_replied_at - never the student''s own rating/content.';
