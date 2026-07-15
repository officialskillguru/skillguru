-- Fixes cascading delete bug on course_progress trigger
BEGIN;
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
COMMIT;
