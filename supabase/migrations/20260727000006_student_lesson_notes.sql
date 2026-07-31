-- Real student Notes feature (Phase 1 - previously entirely unbuilt: no table,
-- no service, no UI on either the Course Learning page or a dedicated "My
-- Notes" page). Personal per-lesson notes, owner-only.

CREATE TABLE IF NOT EXISTS public.lesson_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id   uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz,

    CONSTRAINT lesson_notes_one_per_student_lesson UNIQUE (student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_student ON public.lesson_notes(student_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_course ON public.lesson_notes(student_id, course_id);

CREATE TRIGGER set_updated_at_lesson_notes
    BEFORE UPDATE ON public.lesson_notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own lesson notes" ON public.lesson_notes
    FOR ALL
    USING (student_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (student_id = (select auth.uid()) OR public.has_role('admin'));
