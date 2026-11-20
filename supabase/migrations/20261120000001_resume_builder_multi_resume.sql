-- ============================================================================
-- AI Resume Builder: multiple resumes per student, version history, PDF jobs,
-- AI usage quota, private PDF storage.
-- ============================================================================
-- Purely ADDITIVE. The original single-resume tables (resume_experience,
-- resume_projects, resume_certifications, resume_achievements) and the
-- profiles/student_profiles columns they sit beside are not touched: they
-- keep powering the classic builder and the "Import from my profile" action.
--
-- Objects created (none existed before - checked against all migrations and
-- src/types/database.types.ts):
--   tables    public.resumes, public.resume_versions, public.resume_pdf_jobs,
--             public.resume_ai_usage
--   functions public.resumes_before_write, public.get_my_resume_stats,
--             public.duplicate_resume, public.create_resume_version,
--             public.restore_resume_version, public.resume_version_retention,
--             public.prune_resume_versions, public.consume_resume_ai_quota
--   bucket    storage.buckets 'student-resumes' (private, PDF only, 5 MB)
--
-- Security model
--   * Every row is owned by user_id = auth.uid(). user_id defaults to
--     auth.uid() and is not in the client INSERT/UPDATE column grants, so a
--     browser can never choose or change the owner.
--   * Clients may only write the student-editable columns (title,
--     target_role, template_id, resume_data, schema_version). PDF/status
--     columns are written by the resume-pdf Edge Function (service role).
--   * `revision` is maintained by trigger and bumped on every content change.
--     Clients save with `.eq('revision', expected)`: zero updated rows means
--     another tab/session saved first (optimistic concurrency).
--   * Versions and PDF jobs are read-only to students; they are created by
--     SECURITY DEFINER functions that check ownership, or by the service role.
--   * PDFs live at student-resumes/<user_id>/<resume_id>/v<n>.pdf. Students can
--     read/delete only their own folder; only the service role can upload.
-- ============================================================================

-- ---------------------------------------------------------------- resumes
CREATE TABLE IF NOT EXISTS public.resumes (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
    title                     text NOT NULL,
    target_role               text,
    template_id               text,
    status                    text NOT NULL DEFAULT 'draft',
    resume_data               jsonb NOT NULL DEFAULT '{}'::jsonb,
    schema_version            int  NOT NULL DEFAULT 1,
    revision                  int  NOT NULL DEFAULT 1,
    current_version           int  NOT NULL DEFAULT 0,
    latest_generated_at       timestamptz,
    latest_generated_revision int,
    latest_pdf_path           text,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT resumes_title_length       CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
    CONSTRAINT resumes_target_role_length CHECK (target_role IS NULL OR char_length(target_role) <= 120),
    CONSTRAINT resumes_template_id_format CHECK (template_id IS NULL OR template_id ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
    CONSTRAINT resumes_status_valid       CHECK (status IN ('draft', 'completed')),
    CONSTRAINT resumes_data_is_object     CHECK (jsonb_typeof(resume_data) = 'object'),
    CONSTRAINT resumes_data_size          CHECK (pg_column_size(resume_data) <= 262144),
    CONSTRAINT resumes_schema_version_pos CHECK (schema_version >= 1),
    CONSTRAINT resumes_id_user_unique     UNIQUE (id, user_id)
);

COMMENT ON TABLE public.resumes IS 'AI Resume Builder: one row per student resume. resume_data is the single structured source of truth for every template.';
COMMENT ON COLUMN public.resumes.revision IS 'Optimistic-concurrency counter, bumped by trigger on every content change. Save with .eq(revision, expected).';
COMMENT ON COLUMN public.resumes.status IS 'draft until a PDF has been generated successfully (set by the resume-pdf Edge Function).';

CREATE INDEX IF NOT EXISTS idx_resumes_user_updated ON public.resumes (user_id, updated_at DESC);

-- -------------------------------------------------------- resume_versions
CREATE TABLE IF NOT EXISTS public.resume_versions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id             uuid NOT NULL,
    user_id               uuid NOT NULL,
    version_number        int  NOT NULL,
    source                text NOT NULL,
    label                 text,
    template_id           text,
    title                 text NOT NULL,
    target_role           text,
    resume_data_snapshot  jsonb NOT NULL,
    schema_version        int  NOT NULL,
    resume_revision       int  NOT NULL,
    pdf_storage_path      text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT resume_versions_resume_fk FOREIGN KEY (resume_id, user_id)
        REFERENCES public.resumes (id, user_id) ON DELETE CASCADE,
    CONSTRAINT resume_versions_number_unique UNIQUE (resume_id, version_number),
    CONSTRAINT resume_versions_source_valid CHECK (source IN ('manual', 'generated', 'restore_backup')),
    CONSTRAINT resume_versions_label_length CHECK (label IS NULL OR char_length(label) <= 120)
);

COMMENT ON TABLE public.resume_versions IS 'Meaningful snapshots of a resume: explicit saves, every generated PDF, and an automatic backup before a restore. Not written per keystroke.';

CREATE INDEX IF NOT EXISTS idx_resume_versions_resume ON public.resume_versions (resume_id, version_number DESC);

-- -------------------------------------------------------- resume_pdf_jobs
CREATE TABLE IF NOT EXISTS public.resume_pdf_jobs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id           uuid NOT NULL,
    user_id             uuid NOT NULL,
    requested_revision  int  NOT NULL,
    template_id         text NOT NULL,
    status              text NOT NULL DEFAULT 'pending',
    attempt_count       int  NOT NULL DEFAULT 0,
    error_code          text,
    version_id          uuid REFERENCES public.resume_versions(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    started_at          timestamptz,
    completed_at        timestamptz,
    CONSTRAINT resume_pdf_jobs_resume_fk FOREIGN KEY (resume_id, user_id)
        REFERENCES public.resumes (id, user_id) ON DELETE CASCADE,
    CONSTRAINT resume_pdf_jobs_status_valid CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT resume_pdf_jobs_error_code_format CHECK (error_code IS NULL OR error_code ~ '^[A-Z_]{2,64}$')
);

-- At most one active job per resume: a double-clicked "Generate" cannot queue
-- two compilations. The Edge Function treats a unique violation as "already
-- running" and returns the existing job.
CREATE UNIQUE INDEX IF NOT EXISTS uq_resume_pdf_jobs_one_active
    ON public.resume_pdf_jobs (resume_id) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_resume_pdf_jobs_resume ON public.resume_pdf_jobs (resume_id, created_at DESC);

-- -------------------------------------------------------- resume_ai_usage
CREATE TABLE IF NOT EXISTS public.resume_ai_usage (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    operation   text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT resume_ai_usage_operation_format CHECK (operation ~ '^[a-z_]{2,64}$')
);

COMMENT ON TABLE public.resume_ai_usage IS 'One row per accepted resume-ai request; used for per-student rate limiting / spend control. No resume content is stored here.';

CREATE INDEX IF NOT EXISTS idx_resume_ai_usage_user_time ON public.resume_ai_usage (user_id, created_at DESC);

-- ============================================================== triggers
-- Owner and server-managed columns are protected even if column grants are
-- ever loosened; revision is never client-controlled.
CREATE OR REPLACE FUNCTION public.resumes_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    is_server boolean := coalesce(auth.role(), '') = 'service_role' OR auth.uid() IS NULL;
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.revision := 1;
        NEW.created_at := now();
        NEW.updated_at := now();
        IF NOT is_server THEN
            NEW.user_id := auth.uid();
            NEW.status := 'draft';
            NEW.current_version := 0;
            NEW.latest_generated_at := NULL;
            NEW.latest_generated_revision := NULL;
            NEW.latest_pdf_path := NULL;
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'RESUME_OWNER_IMMUTABLE' USING ERRCODE = '42501';
    END IF;

    IF NOT is_server THEN
        NEW.status := OLD.status;
        NEW.current_version := OLD.current_version;
        NEW.latest_generated_at := OLD.latest_generated_at;
        NEW.latest_generated_revision := OLD.latest_generated_revision;
        NEW.latest_pdf_path := OLD.latest_pdf_path;
    END IF;

    NEW.created_at := OLD.created_at;
    IF (NEW.title, NEW.target_role, NEW.template_id, NEW.resume_data, NEW.schema_version)
       IS DISTINCT FROM (OLD.title, OLD.target_role, OLD.template_id, OLD.resume_data, OLD.schema_version) THEN
        NEW.revision := OLD.revision + 1;
        NEW.updated_at := now();
    ELSE
        NEW.revision := OLD.revision;
        IF NOT is_server THEN
            NEW.updated_at := OLD.updated_at;
        ELSE
            NEW.updated_at := now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resumes_before_write ON public.resumes;
CREATE TRIGGER resumes_before_write
    BEFORE INSERT OR UPDATE ON public.resumes
    FOR EACH ROW EXECUTE FUNCTION public.resumes_before_write();

-- Abuse brake: a student can hold at most 50 resumes.
CREATE OR REPLACE FUNCTION public.resumes_enforce_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('resumes_limit:' || NEW.user_id::text));
    IF (SELECT count(*) FROM public.resumes WHERE user_id = NEW.user_id) >= 50 THEN
        RAISE EXCEPTION 'RESUME_LIMIT_REACHED' USING ERRCODE = 'P0001', HINT = 'Delete an unused resume to create a new one.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resumes_enforce_limit ON public.resumes;
CREATE TRIGGER resumes_enforce_limit
    BEFORE INSERT ON public.resumes
    FOR EACH ROW EXECUTE FUNCTION public.resumes_enforce_limit();

-- =================================================================== RLS
ALTER TABLE public.resumes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_pdf_jobs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_ai_usage  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resumes_select_own ON public.resumes;
CREATE POLICY resumes_select_own ON public.resumes
    FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS resumes_insert_own ON public.resumes;
CREATE POLICY resumes_insert_own ON public.resumes
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS resumes_update_own ON public.resumes;
CREATE POLICY resumes_update_own ON public.resumes
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS resumes_delete_own ON public.resumes;
CREATE POLICY resumes_delete_own ON public.resumes
    FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS resume_versions_select_own ON public.resume_versions;
CREATE POLICY resume_versions_select_own ON public.resume_versions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS resume_pdf_jobs_select_own ON public.resume_pdf_jobs;
CREATE POLICY resume_pdf_jobs_select_own ON public.resume_pdf_jobs
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- resume_ai_usage: no client policies at all (service role only).

-- ================================================================ grants
REVOKE ALL ON public.resumes, public.resume_versions, public.resume_pdf_jobs, public.resume_ai_usage FROM anon;
REVOKE ALL ON public.resumes, public.resume_versions, public.resume_pdf_jobs, public.resume_ai_usage FROM authenticated;

GRANT SELECT, DELETE ON public.resumes TO authenticated;
GRANT INSERT (title, target_role, template_id, resume_data, schema_version) ON public.resumes TO authenticated;
GRANT UPDATE (title, target_role, template_id, resume_data, schema_version) ON public.resumes TO authenticated;
GRANT SELECT ON public.resume_versions TO authenticated;
GRANT SELECT ON public.resume_pdf_jobs TO authenticated;

GRANT ALL ON public.resumes, public.resume_versions, public.resume_pdf_jobs, public.resume_ai_usage TO service_role;

-- ============================================================= functions

-- Dashboard statistics, computed from real rows under the caller's RLS.
CREATE OR REPLACE FUNCTION public.get_my_resume_stats()
RETURNS TABLE (
    total_count        int,
    completed_count    int,
    draft_count        int,
    last_updated_id    uuid,
    last_updated_title text,
    last_updated_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT
        count(*)::int,
        count(*) FILTER (WHERE r.status = 'completed')::int,
        count(*) FILTER (WHERE r.status = 'draft')::int,
        (SELECT x.id FROM public.resumes x WHERE x.user_id = auth.uid() ORDER BY x.updated_at DESC LIMIT 1),
        (SELECT x.title FROM public.resumes x WHERE x.user_id = auth.uid() ORDER BY x.updated_at DESC LIMIT 1),
        max(r.updated_at)
    FROM public.resumes r
    WHERE r.user_id = auth.uid();
$$;

-- Copies content only. The copy is a fresh draft with no PDF, versions or jobs,
-- so no storage object is ever shared between two resumes.
CREATE OR REPLACE FUNCTION public.duplicate_resume(p_resume_id uuid, p_title text DEFAULT NULL)
RETURNS public.resumes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    src public.resumes;
    result public.resumes;
    new_title text;
BEGIN
    SELECT * INTO src FROM public.resumes WHERE id = p_resume_id AND user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESUME_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    new_title := left(coalesce(nullif(btrim(p_title), ''), src.title || ' (Copy)'), 120);

    INSERT INTO public.resumes (title, target_role, template_id, resume_data, schema_version)
    VALUES (new_title, src.target_role, src.template_id, src.resume_data, src.schema_version)
    RETURNING * INTO result;
    RETURN result;
END;
$$;

-- Retention limit for versions. Configurable without a migration:
--   ALTER DATABASE postgres SET app.resume_version_retention = '30';
CREATE OR REPLACE FUNCTION public.resume_version_retention()
RETURNS int
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT greatest(coalesce(nullif(current_setting('app.resume_version_retention', true), '')::int, 20), 3);
$$;

-- Drops the oldest snapshots beyond the retention limit. Versions that own a
-- generated PDF are left for the resume-pdf function, which also removes the
-- storage object (SQL cannot delete storage objects safely).
CREATE OR REPLACE FUNCTION public.prune_resume_versions(p_resume_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    DELETE FROM public.resume_versions v
    WHERE v.resume_id = p_resume_id
      AND v.pdf_storage_path IS NULL
      AND v.id NOT IN (
          SELECT k.id FROM public.resume_versions k
          WHERE k.resume_id = p_resume_id
          ORDER BY k.version_number DESC
          LIMIT public.resume_version_retention()
      );
$$;
REVOKE ALL ON FUNCTION public.prune_resume_versions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_resume_versions(uuid) TO service_role;

-- Snapshot of the resume's *current saved* data (never client-supplied data).
CREATE OR REPLACE FUNCTION public.create_resume_version(p_resume_id uuid, p_label text DEFAULT NULL)
RETURNS public.resume_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r public.resumes;
    v public.resume_versions;
    next_number int;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO r FROM public.resumes WHERE id = p_resume_id AND user_id = auth.uid() FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESUME_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    SELECT coalesce(max(version_number), 0) + 1 INTO next_number
    FROM public.resume_versions WHERE resume_id = r.id;

    INSERT INTO public.resume_versions
        (resume_id, user_id, version_number, source, label, template_id, title, target_role,
         resume_data_snapshot, schema_version, resume_revision)
    VALUES
        (r.id, r.user_id, next_number, 'manual', left(nullif(btrim(p_label), ''), 120), r.template_id, r.title, r.target_role,
         r.resume_data, r.schema_version, r.revision)
    RETURNING * INTO v;

    PERFORM public.prune_resume_versions(r.id);
    RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.create_resume_version(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_resume_version(uuid, text) TO authenticated, service_role;

-- Restores a snapshot as a NEW revision. The current state is first saved as
-- a 'restore_backup' version so nothing is silently lost. Fails with
-- RESUME_REVISION_CONFLICT (HTTP 409 via PostgREST's PT409) when the caller's
-- view of the resume is stale.
CREATE OR REPLACE FUNCTION public.restore_resume_version(p_version_id uuid, p_expected_revision int)
RETURNS public.resumes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v public.resume_versions;
    r public.resumes;
    result public.resumes;
    next_number int;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v FROM public.resume_versions WHERE id = p_version_id AND user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESUME_VERSION_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    SELECT * INTO r FROM public.resumes WHERE id = v.resume_id AND user_id = auth.uid() FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESUME_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    IF r.revision <> p_expected_revision THEN
        RAISE EXCEPTION 'RESUME_REVISION_CONFLICT' USING ERRCODE = 'PT409';
    END IF;

    SELECT coalesce(max(version_number), 0) + 1 INTO next_number
    FROM public.resume_versions WHERE resume_id = r.id;
    INSERT INTO public.resume_versions
        (resume_id, user_id, version_number, source, label, template_id, title, target_role,
         resume_data_snapshot, schema_version, resume_revision)
    VALUES
        (r.id, r.user_id, next_number, 'restore_backup', 'Before restoring version ' || v.version_number,
         r.template_id, r.title, r.target_role, r.resume_data, r.schema_version, r.revision);

    UPDATE public.resumes
       SET resume_data = v.resume_data_snapshot,
           schema_version = v.schema_version,
           template_id = v.template_id,
           target_role = v.target_role
     WHERE id = r.id
     RETURNING * INTO result;

    PERFORM public.prune_resume_versions(r.id);
    RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_resume_version(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_resume_version(uuid, int) TO authenticated, service_role;

-- Atomic per-student AI quota check-and-consume, called by the resume-ai Edge
-- Function with the service role. Serialised per user so parallel requests
-- cannot all slip under the limit.
CREATE OR REPLACE FUNCTION public.consume_resume_ai_quota(
    p_user_id uuid,
    p_operation text,
    p_per_minute int,
    p_per_day int
)
RETURNS TABLE (allowed boolean, retry_after_seconds int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    minute_count int;
    day_count int;
    oldest_in_minute timestamptz;
    oldest_in_day timestamptz;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('resume_ai_quota:' || p_user_id::text));

    SELECT count(*), min(created_at) INTO minute_count, oldest_in_minute
    FROM public.resume_ai_usage
    WHERE user_id = p_user_id AND created_at > now() - interval '1 minute';

    SELECT count(*), min(created_at) INTO day_count, oldest_in_day
    FROM public.resume_ai_usage
    WHERE user_id = p_user_id AND created_at > now() - interval '1 day';

    IF day_count >= p_per_day THEN
        RETURN QUERY SELECT false, greatest(1, ceil(extract(epoch FROM (oldest_in_day + interval '1 day' - now())))::int);
        RETURN;
    END IF;
    IF minute_count >= p_per_minute THEN
        RETURN QUERY SELECT false, greatest(1, ceil(extract(epoch FROM (oldest_in_minute + interval '1 minute' - now())))::int);
        RETURN;
    END IF;

    INSERT INTO public.resume_ai_usage (user_id, operation) VALUES (p_user_id, p_operation);
    RETURN QUERY SELECT true, 0;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_resume_ai_quota(uuid, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_resume_ai_quota(uuid, text, int, int) TO service_role;

REVOKE ALL ON FUNCTION public.get_my_resume_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_resume_stats() TO authenticated;
REVOKE ALL ON FUNCTION public.duplicate_resume(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_resume(uuid, text) TO authenticated;

-- ================================================================ storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-resumes', 'student-resumes', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Read/delete own folder only. No INSERT/UPDATE policy: uploads come solely
-- from the resume-pdf Edge Function using the service role.
DROP POLICY IF EXISTS "student_resumes_select_own" ON storage.objects;
CREATE POLICY "student_resumes_select_own" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'student-resumes' AND public.storage_folder_uuid(name) = auth.uid());

DROP POLICY IF EXISTS "student_resumes_delete_own" ON storage.objects;
CREATE POLICY "student_resumes_delete_own" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'student-resumes' AND public.storage_folder_uuid(name) = auth.uid());

-- ============================================================ verification
-- Run after applying (as an admin in the SQL editor):
--   SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('resumes','resume_versions','resume_pdf_jobs','resume_ai_usage');      -- all true
--   SELECT policyname, tablename FROM pg_policies
--    WHERE tablename IN ('resumes','resume_versions','resume_pdf_jobs')
--       OR policyname LIKE 'student_resumes_%';
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'student-resumes';    -- public = false
--   SELECT has_function_privilege('authenticated', 'public.consume_resume_ai_quota(uuid,text,int,int)', 'EXECUTE'); -- false
