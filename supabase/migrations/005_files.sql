-- =============================================================================
-- Migration: 005_files.sql
-- Version:   1.0.0
-- Description:
--   Creates the file registry for SkillGuru. Every uploaded asset (avatars,
--   videos, documents, thumbnails, certificates) is tracked here.
--   Resolves deferred FKs from 003_identity.sql.
--
--   Tables: files
--   Deferred FKs: profiles.avatar_file_id, student_profiles.resume_file_id
--   RLS: Owner access + public file access + admin bypass
--
-- Dependencies:
--   001_extensions.sql
--   002_enums.sql  (virus_scan_status)
--   003_identity.sql (profiles, student_profiles)
--   004_rbac.sql (has_role, has_permission)
--
-- Rollback:
--   1. ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_avatar_file_fk
--   2. ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_resume_file_fk
--   3. DROP policies on files
--   4. DROP TABLE files CASCADE
--   WARNING: Any future tables referencing files.id will also need FK cleanup.
--
-- Author:
--   SkillGuru Platform Engineering
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: files
-- ============================================================================
-- WHY: Central file registry. Every uploaded asset is tracked here instead
--      of storing URLs as raw text. This provides:
--        - Single source of truth for file metadata
--        - Consistent access control via RLS
--        - Virus scanning status tracking
--        - Soft-delete with audit trail (deleted_by)
--        - Referential integrity from all consuming tables
--
-- DESIGN:
--   - `uploaded_by` is the file owner. Used in RLS for self-access.
--     ON DELETE SET NULL preserves files when the uploader is hard-deleted
--     (e.g., course content survives mentor account removal).
--   - `bucket` + `object_key` = Supabase Storage coordinates.
--   - `storage_path` = complete path for APIs that return a single string.
--   - `is_public` = explicit access flag. Never infer from bucket name.
--
-- GROWTH: High volume. Every avatar, lesson video, resource PDF, certificate
--   generates a row. Expect 1M+ rows at scale. Indexed accordingly.
--
-- QUERY PATTERNS:
--   1. "My files" — idx_files_uploaded_by
--   2. "File by ID" — PK (FK lookups from profiles, lessons, certificates)
--   3. "Storage lookup" — idx_files_storage_path_active (unique partial)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.files (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- File identity
    original_name       text NOT NULL,
    stored_name         text NOT NULL,
    mime_type           text NOT NULL,
    size_bytes          bigint NOT NULL,

    -- Storage location (Supabase Storage)
    bucket              text NOT NULL,
    object_key          text NOT NULL,
    storage_path        text NOT NULL,
    storage_region      text,

    -- Access & safety
    is_public           boolean NOT NULL DEFAULT false,
    virus_scan_status   virus_scan_status NOT NULL DEFAULT 'pending',
    checksum            text,

    -- Ownership
    uploaded_by         uuid,

    -- Standard audit columns
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    created_by          uuid,
    updated_by          uuid,
    deleted_by          uuid,

    -- Constraints
    CONSTRAINT files_uploaded_by_fk FOREIGN KEY (uploaded_by)
        REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT files_deleted_by_fk FOREIGN KEY (deleted_by)
        REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT files_size_positive CHECK (size_bytes > 0),
    CONSTRAINT files_mime_not_empty CHECK (mime_type <> ''),
    CONSTRAINT files_original_name_not_empty CHECK (original_name <> ''),
    CONSTRAINT files_bucket_not_empty CHECK (bucket <> ''),
    CONSTRAINT files_object_key_not_empty CHECK (object_key <> ''),
    CONSTRAINT files_storage_path_not_empty CHECK (storage_path <> '')
);

COMMENT ON TABLE public.files IS 'Central file registry. Every uploaded asset is tracked here. Consuming tables reference files.id instead of storing raw URLs.';
COMMENT ON COLUMN public.files.original_name IS 'Original filename as uploaded by the user (e.g., "resume_2025.pdf").';
COMMENT ON COLUMN public.files.stored_name IS 'Filename in storage, typically UUID-based (e.g., "a1b2c3d4.pdf").';
COMMENT ON COLUMN public.files.bucket IS 'Supabase Storage bucket name (e.g., "avatars", "course-content").';
COMMENT ON COLUMN public.files.object_key IS 'Path within the bucket (e.g., "users/uuid/avatar.jpg").';
COMMENT ON COLUMN public.files.storage_path IS 'Complete storage path. Some APIs return a single combined path.';
COMMENT ON COLUMN public.files.is_public IS 'Explicit access flag. True = publicly accessible (avatars, thumbnails). False = private (resumes, submissions). Never infer from bucket name.';
COMMENT ON COLUMN public.files.virus_scan_status IS 'File safety scanning lifecycle. New uploads start as "pending".';
COMMENT ON COLUMN public.files.checksum IS 'SHA-256 hash for integrity verification and deduplication.';
COMMENT ON COLUMN public.files.uploaded_by IS 'File owner. FK to profiles.id. SET NULL on profile deletion to preserve files (course content survives mentor removal).';
COMMENT ON COLUMN public.files.deleted_by IS 'Who soft-deleted this file. Nullable. FK to profiles.id.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by
    ON public.files(uploaded_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_files_storage_path_active
    ON public.files(storage_path) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_files_active
    ON public.files(id) WHERE deleted_at IS NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.files;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 2: Resolve Deferred Foreign Keys from 003_identity.sql
-- ============================================================================
-- WHY: 003_identity.sql created avatar_file_id and resume_file_id columns
--      but could not add FK constraints because the files table did not
--      exist yet. Now we add them.
-- ON DELETE SET NULL: If a file is deleted, the profile/student_profile
--      keeps its other data — it just loses the avatar/resume reference.
-- ============================================================================

-- profiles.avatar_file_id → files.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_avatar_file_fk'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_avatar_file_fk
            FOREIGN KEY (avatar_file_id)
            REFERENCES public.files(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- student_profiles.resume_file_id → files.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_resume_file_fk'
    ) THEN
        ALTER TABLE public.student_profiles
            ADD CONSTRAINT student_profiles_resume_file_fk
            FOREIGN KEY (resume_file_id)
            REFERENCES public.files(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- ============================================================================
-- SECTION 3: Row Level Security
-- ============================================================================
-- POLICY DESIGN:
--   INSERT: Authenticated users can insert files they own.
--   SELECT: Users see their own files + public files + admin sees all.
--   UPDATE: Users can update their own file metadata.
--   DELETE: No physical delete policy. Soft-delete via application logic
--           (UPDATE deleted_at, deleted_by). Admin can manage all.
--
-- SECURITY NOTE: WITH CHECK on INSERT ensures a user cannot insert a file
--   row claiming uploaded_by = someone_else. This prevents file ownership
--   impersonation.
-- ============================================================================

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated users can register their own uploads
CREATE POLICY "Users can register own file uploads"
    ON public.files FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);

-- SELECT: own files
CREATE POLICY "Users can view their own files"
    ON public.files FOR SELECT
    USING (auth.uid() = uploaded_by AND deleted_at IS NULL);

-- SELECT: public files (anyone, including for avatars/thumbnails)
CREATE POLICY "Anyone can view public files"
    ON public.files FOR SELECT
    USING (is_public = true AND deleted_at IS NULL);

-- UPDATE: own files only (e.g., rename, update scan status)
CREATE POLICY "Users can update their own files"
    ON public.files FOR UPDATE
    USING (auth.uid() = uploaded_by AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = uploaded_by);

-- Admin bypass
CREATE POLICY "Admins can manage all files"
    ON public.files FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

-- ============================================================================
-- SECTION 4: Verification
-- ============================================================================

DO $$
DECLARE
    _count int;
BEGIN
    -- ---- STRUCTURAL ----

    -- 1. Table exists
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'files') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: files table not found';
    END IF;

    -- 2. Primary key
    SELECT COUNT(*) INTO _count FROM pg_constraint
    WHERE contype = 'p' AND conrelid = 'public.files'::regclass;
    IF _count != 1 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: files primary key not found';
    END IF;

    -- 3. Foreign keys on files
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_uploaded_by_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: files_uploaded_by_fk not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_deleted_by_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: files_deleted_by_fk not found';
    END IF;

    -- 4. Deferred FKs resolved
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_avatar_file_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: profiles_avatar_file_fk not found (deferred FK from 003)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_resume_file_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: student_profiles_resume_file_fk not found (deferred FK from 003)';
    END IF;

    -- 5. CHECK constraints
    SELECT COUNT(*) INTO _count FROM pg_constraint
    WHERE conrelid = 'public.files'::regclass AND contype = 'c';
    IF _count < 6 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected at least 6 CHECK constraints on files, found %', _count;
    END IF;

    -- 6. Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_files_uploaded_by') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_files_uploaded_by not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_files_storage_path_active') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_files_storage_path_active not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_files_active') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_files_active not found';
    END IF;

    -- 7. RLS enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'files'
          AND relnamespace = 'public'::regnamespace
          AND relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: RLS not enabled on files';
    END IF;

    -- 8. RLS policies
    SELECT COUNT(*) INTO _count FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'files';
    IF _count < 5 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected at least 5 RLS policies on files, found %', _count;
    END IF;

    -- 9. updated_at trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_updated_at' AND tgrelid = 'public.files'::regclass
    ) THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: set_updated_at trigger not found on files';
    END IF;

    -- 10. Verify deferred FK actions are SET NULL
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_avatar_file_fk' AND confdeltype = 'n'
    ) THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: profiles_avatar_file_fk should be ON DELETE SET NULL';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  005_files.sql — VERIFICATION PASSED';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  Table:           files';
    RAISE NOTICE '  Primary Key:     1';
    RAISE NOTICE '  Foreign Keys:    2 (uploaded_by, deleted_by)';
    RAISE NOTICE '  Deferred FKs:    2 resolved (avatar_file, resume_file)';
    RAISE NOTICE '  CHECK:           6 constraints';
    RAISE NOTICE '  Indexes:         3 (uploaded_by, storage_path_active, active)';
    RAISE NOTICE '  RLS:             Enabled with 5 policies';
    RAISE NOTICE '  updated_at:      Trigger attached';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
END;
$$;

COMMIT;
