-- Resume Builder (Phase 1 - previously entirely greenfield: no table, service,
-- or UI existed anywhere for a student to build a structured resume).
--
-- Reuses existing data rather than duplicating it: contact info and links
-- come from `profiles` (full_name/email/phone/city/state/country/linkedin_url/
-- github_url/portfolio_url/website_url), the professional summary reuses the
-- already-real but previously UI-less `profiles.bio` column, and education/
-- skills reuse `student_profiles` (education/college/graduation_year/skills)
-- rather than a new single-entry table - a second education table would just
-- duplicate that shape. Only genuinely list-shaped, currently-absent resume
-- sections get new tables here: work experience, projects, certifications,
-- achievements. Mirrors mentor_experience/mentor_projects/mentor_certifications/
-- mentor_achievements' exact conventions (sort_order, soft delete, owner-scoped
-- RLS) - just owned by a student instead of a mentor.

CREATE TABLE public.resume_experience (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       text NOT NULL,
    company     text NOT NULL,
    location    text,
    start_date  date NOT NULL,
    end_date    date,
    is_current  boolean NOT NULL DEFAULT false,
    description text,
    sort_order  int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

CREATE TABLE public.resume_projects (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text,
    tech_stack  text[] NOT NULL DEFAULT '{}',
    project_url text,
    sort_order  int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

CREATE TABLE public.resume_certifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name            text NOT NULL,
    issuer          text,
    issue_date      date,
    credential_url  text,
    sort_order      int NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);

CREATE TABLE public.resume_achievements (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title         text NOT NULL,
    description   text,
    date_achieved date,
    sort_order    int NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz
);

CREATE INDEX idx_resume_experience_student ON public.resume_experience(student_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_resume_projects_student ON public.resume_projects(student_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_resume_certifications_student ON public.resume_certifications(student_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_resume_achievements_student ON public.resume_achievements(student_id, sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at_resume_experience BEFORE UPDATE ON public.resume_experience FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_resume_projects BEFORE UPDATE ON public.resume_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_resume_certifications BEFORE UPDATE ON public.resume_certifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_resume_achievements BEFORE UPDATE ON public.resume_achievements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.resume_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_achievements ENABLE ROW LEVEL SECURITY;

-- Owner-only (+ admin) - resumes are not public in this pass, unlike mentor
-- profile content, so a single FOR ALL policy per table is sufficient (no
-- separate public-read policy to avoid overlapping with).
CREATE POLICY "resume_experience_owner_all" ON public.resume_experience FOR ALL
    USING (student_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (student_id = (select auth.uid()) OR public.has_role('admin'));

CREATE POLICY "resume_projects_owner_all" ON public.resume_projects FOR ALL
    USING (student_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (student_id = (select auth.uid()) OR public.has_role('admin'));

CREATE POLICY "resume_certifications_owner_all" ON public.resume_certifications FOR ALL
    USING (student_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (student_id = (select auth.uid()) OR public.has_role('admin'));

CREATE POLICY "resume_achievements_owner_all" ON public.resume_achievements FOR ALL
    USING (student_id = (select auth.uid()) OR public.has_role('admin'))
    WITH CHECK (student_id = (select auth.uid()) OR public.has_role('admin'));
