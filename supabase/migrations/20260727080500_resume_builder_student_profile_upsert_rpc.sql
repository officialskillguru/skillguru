-- student_profiles' INSERT policy is deliberately admin-only (same convention
-- as mentor_profiles) - a student can never INSERT their own row directly.
-- The Resume Builder needs a student-authored path to create it the first
-- time they add education/skills, so - matching this project's established
-- pattern for privileged writes (submit_quiz_attempt, apply_to_job, etc.) -
-- this RPC does it as SECURITY DEFINER, hardcoded to auth.uid() (no student_id
-- parameter at all, so there is no impersonation surface).
CREATE OR REPLACE FUNCTION public.upsert_my_student_profile(
    p_education text DEFAULT NULL,
    p_college text DEFAULT NULL,
    p_graduation_year integer DEFAULT NULL,
    p_skills text[] DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    INSERT INTO public.student_profiles (id, education, college, graduation_year, skills)
    VALUES (auth.uid(), p_education, p_college, p_graduation_year, COALESCE(p_skills, '{}'))
    ON CONFLICT (id) DO UPDATE SET
        education = EXCLUDED.education,
        college = EXCLUDED.college,
        graduation_year = EXCLUDED.graduation_year,
        skills = EXCLUDED.skills;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_student_profile(text, text, integer, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_my_student_profile(text, text, integer, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_my_student_profile(text, text, integer, text[]) TO authenticated;
