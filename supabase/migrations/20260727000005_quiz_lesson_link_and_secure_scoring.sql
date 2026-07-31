-- Real quiz/mock-test feature (Student module gap: quiz.service.ts/useQuiz.ts
-- had zero UI consumers on either the mentor-authoring or student-taking side,
-- despite a substantial real schema already existing).
--
-- Found and fixed two real defects while wiring this up:
-- 1. quizzes.getQuizByLessonId() queried module_id with a comment admitting
--    "schema change: quizzes are linked to modules, not lessons" - but lessons
--    already have a "quiz" content_type meant to be per-lesson. Adding a real
--    lesson_id column rather than continuing to paper over the mismatch.
-- 2. quiz_questions/quiz_options SELECT policies allowed ANY authenticated
--    user (not just enrolled students) to read a published quiz's questions
--    AND options - including quiz_options.is_correct, the answer key - before
--    ever attempting it. Tightened to require real active enrollment.
--
-- Scoring itself is moved server-side (submit_quiz_attempt RPC) so the answer
-- key is never fetched by the client at all during a real attempt - mirrors
-- the reply_to_testimonial/book-mentor-session pattern already used elsewhere
-- in this project for "client must not see/touch privileged data directly".

ALTER TABLE public.quizzes
    ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON public.quizzes(lesson_id);

-- Tighten read access: enrolled students (or the owning mentor, or admin) only.
DROP POLICY IF EXISTS consolidated_select ON public.quizzes;
CREATE POLICY consolidated_select ON public.quizzes
    FOR SELECT USING (
        public.has_role('admin')
        OR course_id IN (SELECT id FROM public.courses WHERE mentor_id = (SELECT auth.uid()))
        OR (is_published = true AND public.has_active_enrollment(course_id))
    );

DROP POLICY IF EXISTS consolidated_select ON public.quiz_questions;
CREATE POLICY consolidated_select ON public.quiz_questions
    FOR SELECT USING (
        public.has_role('admin')
        OR quiz_id IN (
            SELECT id FROM public.quizzes
            WHERE course_id IN (SELECT id FROM public.courses WHERE mentor_id = (SELECT auth.uid()))
        )
        OR quiz_id IN (
            SELECT id FROM public.quizzes
            WHERE is_published = true AND public.has_active_enrollment(course_id)
        )
    );

DROP POLICY IF EXISTS consolidated_select ON public.quiz_options;
CREATE POLICY consolidated_select ON public.quiz_options
    FOR SELECT USING (
        public.has_role('admin')
        OR question_id IN (
            SELECT qq.id FROM public.quiz_questions qq
            JOIN public.quizzes qz ON qz.id = qq.quiz_id
            WHERE qz.course_id IN (SELECT id FROM public.courses WHERE mentor_id = (SELECT auth.uid()))
        )
        OR question_id IN (
            SELECT qq.id FROM public.quiz_questions qq
            JOIN public.quizzes qz ON qz.id = qq.quiz_id
            WHERE qz.is_published = true AND public.has_active_enrollment(qz.course_id)
        )
    );

-- Real server-side scoring: computes the score from the answer key without
-- ever returning is_correct for unattempted/unselected options, and writes
-- the attempt + answer rows atomically. Only supports the auto-gradable
-- question types (mcq, true_false); multi_select/short_answer are recorded
-- but not scored - not fabricating an auto-grader for formats this pass
-- doesn't build authoring UI for.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_quiz_id uuid,
    p_enrollment_id uuid,
    p_selected_option_ids uuid[] -- one selected quiz_options.id per answered mcq/true_false question, in any order
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id uuid;
    v_passing_score int;
    v_total_gradable int;
    v_correct_count int;
    v_score int;
    v_passed boolean;
    v_attempt_id uuid;
    v_attempt_number int;
BEGIN
    SELECT student_id INTO v_student_id FROM public.enrollments WHERE id = p_enrollment_id;
    IF v_student_id IS NULL OR v_student_id <> auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to submit this attempt';
    END IF;

    SELECT passing_score INTO v_passing_score FROM public.quizzes WHERE id = p_quiz_id AND is_published = true;
    IF v_passing_score IS NULL THEN
        RAISE EXCEPTION 'Quiz not found or not published';
    END IF;

    SELECT count(*) INTO v_total_gradable
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id AND question_type IN ('mcq', 'true_false');

    IF v_total_gradable = 0 THEN
        RAISE EXCEPTION 'This quiz has no auto-gradable questions';
    END IF;

    SELECT count(*) INTO v_correct_count
    FROM public.quiz_options o
    WHERE o.id = ANY(p_selected_option_ids) AND o.is_correct = true;

    v_score := round((v_correct_count::numeric / v_total_gradable) * 100);
    v_passed := v_score >= v_passing_score;

    SELECT coalesce(max(attempt_number), 0) + 1 INTO v_attempt_number
    FROM public.quiz_attempts WHERE enrollment_id = p_enrollment_id AND quiz_id = p_quiz_id;

    INSERT INTO public.quiz_attempts (enrollment_id, quiz_id, attempt_number, score, passed, started_at, submitted_at)
    VALUES (p_enrollment_id, p_quiz_id, v_attempt_number, v_score, v_passed, now(), now())
    RETURNING id INTO v_attempt_id;

    INSERT INTO public.quiz_answers (attempt_id, question_id, selected_option_id, is_correct)
    SELECT v_attempt_id, o.question_id, o.id, o.is_correct
    FROM public.quiz_options o
    WHERE o.id = ANY(p_selected_option_ids);

    RETURN jsonb_build_object(
        'attemptId', v_attempt_id,
        'score', v_score,
        'passed', v_passed,
        'correctCount', v_correct_count,
        'totalGradable', v_total_gradable
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.submit_quiz_attempt IS
    'Scores and records a real quiz attempt server-side so the answer key (quiz_options.is_correct) never needs to be fetched by the client during a live attempt.';
