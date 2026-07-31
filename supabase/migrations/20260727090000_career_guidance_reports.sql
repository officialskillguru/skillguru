-- AI Career Guidance (Phase 1 - previously entirely greenfield for students;
-- the public marketing GuidancePage.tsx is an unrelated lead-capture page).
-- Reuses the existing AIProvider/GeminiProvider abstraction built for the AI
-- Voice Agent (supabase/functions/_shared) rather than duplicating LLM
-- wiring, and the same GEMINI_API_KEY Edge Function secret already
-- configured for `converse`. This table stores generated guidance reports so
-- students have real history and every "Generate" click isn't a wasted API
-- call re-fetched on next visit - mirrors the agent_conversations pattern.
--
-- Writes only via the `career-guidance` Edge Function (service-role key) -
-- the report is grounded in server-verified data (real courses, real resume
-- content) and includes an anti-hallucination guard (recommended course IDs
-- are cross-checked against the real catalog before being stored), so a
-- direct client-side INSERT is deliberately not exposed.
CREATE TABLE public.career_guidance_reports (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_role        text NOT NULL,
    summary            text NOT NULL,
    skill_gaps         jsonb NOT NULL DEFAULT '[]'::jsonb,
    recommended_course_ids uuid[] NOT NULL DEFAULT '{}',
    action_items       text[] NOT NULL DEFAULT '{}',
    model_name         text NOT NULL,
    prompt_tokens      integer NOT NULL DEFAULT 0,
    completion_tokens  integer NOT NULL DEFAULT 0,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_guidance_reports_student ON public.career_guidance_reports(student_id, created_at DESC);

ALTER TABLE public.career_guidance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "career_guidance_reports_select" ON public.career_guidance_reports FOR SELECT
    USING (student_id = (select auth.uid()) OR public.has_role('admin'));
-- No INSERT/UPDATE/DELETE policy - written only by the career-guidance Edge
-- Function's service-role client.
