-- =============================================================================
-- Migration: 003_identity.sql
-- Version:   1.0.0
-- Description:
--   Creates the identity domain for SkillGuru: organizations, profiles,
--   mentor_profiles, student_profiles. Includes auth trigger for automatic
--   profile provisioning, RLS policies, and structural verification.
--
-- Dependencies:
--   001_extensions.sql
--   002_enums.sql
--
-- Rollback:
--   Not automatic. Requires manual DROP of tables, triggers, and policies.
--   Never execute rollback on production without a backup.
--
-- Author:
--   SkillGuru Platform Engineering
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Reusable updated_at Trigger Function
-- ============================================================================
-- WHY: Every business table needs automatic updated_at management.
--      A single reusable function avoids duplicating logic across 30+ tables.
-- SAFE: CREATE OR REPLACE is idempotent.
-- RISK: None. This function has no side effects.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    new.updated_at = now();
    RETURN new;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_updated_at IS 'Reusable trigger function. Sets updated_at = now() before every UPDATE.';

-- ============================================================================
-- SECTION 2: organizations
-- ============================================================================
-- WHY: Multi-tenancy foundation. Even with a single organization today,
--      this avoids ALTERing dozens of tables when enterprise clients arrive.
-- GROWTH: 1 row today. 10-100 for enterprise. Never high-volume.
-- RISK: None. Standalone table with no dependencies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    slug            text NOT NULL,
    logo_url        text,
    domain          text,
    status          org_status NOT NULL DEFAULT 'active',
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid,
    updated_by      uuid,

    CONSTRAINT organizations_slug_unique UNIQUE (slug),
    CONSTRAINT organizations_domain_unique UNIQUE (domain)
);

COMMENT ON TABLE public.organizations IS 'Multi-tenant organization. Profiles reference this optionally. Future enterprise clients become rows, not schema changes.';
COMMENT ON COLUMN public.organizations.slug IS 'URL-safe unique identifier used in routing and API lookups.';
COMMENT ON COLUMN public.organizations.domain IS 'Custom domain for white-label deployments. Nullable.';
COMMENT ON COLUMN public.organizations.created_by IS 'Informational audit column. No FK constraint (circular dependency with profiles).';
COMMENT ON COLUMN public.organizations.updated_by IS 'Informational audit column. No FK constraint (circular dependency with profiles).';

DROP TRIGGER IF EXISTS set_updated_at ON public.organizations;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default organization. Infrastructure data, not business data.
-- This exists for assignment to profiles, NOT as a trigger dependency.
INSERT INTO public.organizations (name, slug, status)
VALUES ('SkillGuru', 'skillguru', 'active')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 3: profiles
-- ============================================================================
-- WHY: Central identity record for every authenticated user. Lightweight
--      by design — role-specific data lives in mentor_profiles and
--      student_profiles. This table stores only universal identity and
--      contact information shared across all roles.
--
-- IMPORTANT: profiles.email is a SYNCHRONIZED CACHE of auth.users.email.
--   The canonical source of truth is ALWAYS auth.users.email.
--   The handle_new_user trigger copies it on signup.
--   If the user changes their email via Supabase Auth, a separate
--   hook (auth.on_user_updated) should keep this column in sync.
--   Application code should NEVER write to profiles.email directly.
--
-- GROWTH: 1:1 with signups. 100K+ at scale.
-- QUERY: Every authenticated request hits this table via auth.uid().
-- RISK: FK to auth.users means deleting an auth user cascades to profile.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id              uuid PRIMARY KEY,
    org_id          uuid,
    full_name       text NOT NULL DEFAULT '',
    email           text NOT NULL,
    phone           text,
    avatar_file_id  uuid,
    city            text,
    state           text,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    created_by      uuid,
    updated_by      uuid,

    CONSTRAINT profiles_email_unique UNIQUE (email),
    CONSTRAINT profiles_org_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT profiles_auth_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.profiles IS 'Central identity record. 1:1 with auth.users. Created automatically by handle_new_user trigger. Role-specific data lives in mentor_profiles and student_profiles.';
COMMENT ON COLUMN public.profiles.id IS 'Matches auth.users.id exactly. No default — always set by handle_new_user trigger.';
COMMENT ON COLUMN public.profiles.org_id IS 'Nullable. Organization assignment is a business concern, not an authentication concern. Assigned after signup via admin or application logic.';
COMMENT ON COLUMN public.profiles.email IS 'SYNCHRONIZED CACHE of auth.users.email. Source of truth is auth.users. Never write directly.';
COMMENT ON COLUMN public.profiles.avatar_file_id IS 'References files.id. FK constraint deferred to 005_files.sql (files table does not exist yet).';
COMMENT ON COLUMN public.profiles.created_by IS 'Informational audit column. NULL for trigger-created rows. No FK (self-referential circular).';
COMMENT ON COLUMN public.profiles.updated_by IS 'Informational audit column. No FK (self-referential circular).';

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 4: mentor_profiles
-- ============================================================================
-- WHY: Mentor-specific data (bio, expertise, social, payout) must not
--      pollute the universal profiles table. A student should never carry
--      empty linkedin_url and payout_details columns.
--      Created when the mentor role is assigned, NOT at signup.
-- GROWTH: ~1-5% of total profiles.
-- QUERY: Course pages (instructor bio), mentor dashboard, admin management.
-- RISK: CASCADE from profiles ensures cleanup on user deletion.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
    id                      uuid PRIMARY KEY,
    headline                text,
    bio                     text,
    expertise               text[] NOT NULL DEFAULT '{}',
    years_of_experience     int,
    linkedin_url            text,
    youtube_url             text,
    website_url             text,
    social_links            jsonb NOT NULL DEFAULT '{}',
    certifications          jsonb NOT NULL DEFAULT '[]',
    is_verified             boolean NOT NULL DEFAULT false,
    payout_details          jsonb NOT NULL DEFAULT '{}',
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid,
    updated_by              uuid,

    CONSTRAINT mentor_profiles_profile_fk FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.mentor_profiles IS '1:1 extension of profiles for mentor-specific data. Created when mentor role is assigned, not at signup.';
COMMENT ON COLUMN public.mentor_profiles.id IS 'Same UUID as profiles.id. This is a 1:1 extension, not a separate entity.';
COMMENT ON COLUMN public.mentor_profiles.payout_details IS 'Bank/UPI details for commission disbursement. Encrypted at application layer, never in SQL.';
COMMENT ON COLUMN public.mentor_profiles.is_verified IS 'Admin-verified mentor flag. Controls visibility on public course pages.';

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_verified ON public.mentor_profiles(is_verified);

DROP TRIGGER IF EXISTS set_updated_at ON public.mentor_profiles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.mentor_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 5: student_profiles
-- ============================================================================
-- WHY: Student-specific data (education, skills, goals) must not bloat
--      profiles or mentor_profiles. Enables the future AI career counsellor
--      and resume builder to read structured student data.
--      Created on-demand when the student completes their profile, NOT at signup.
-- GROWTH: ~90% of total profiles.
-- QUERY: Student dashboard, AI features, admin analytics.
-- RISK: CASCADE from profiles ensures cleanup on user deletion.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_profiles (
    id                  uuid PRIMARY KEY,
    education           text,
    college             text,
    graduation_year     int,
    resume_file_id      uuid,
    skills              text[] NOT NULL DEFAULT '{}',
    interests           text[] NOT NULL DEFAULT '{}',
    goals               jsonb NOT NULL DEFAULT '{}',
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    created_by          uuid,
    updated_by          uuid,

    CONSTRAINT student_profiles_profile_fk FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.student_profiles IS '1:1 extension of profiles for student-specific data. Created on-demand, not at signup.';
COMMENT ON COLUMN public.student_profiles.id IS 'Same UUID as profiles.id. This is a 1:1 extension, not a separate entity.';
COMMENT ON COLUMN public.student_profiles.resume_file_id IS 'References files.id. FK constraint deferred to 005_files.sql.';

DROP TRIGGER IF EXISTS set_updated_at ON public.student_profiles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 6: Auth Trigger — handle_new_user
-- ============================================================================
-- WHAT: When a user signs up via Supabase Auth, a row appears in auth.users.
--       This trigger automatically provisions the matching public.profiles row.
--       The frontend NEVER creates profiles directly.
--
-- BEHAVIOR:
--   1. Inserts into public.profiles with id = new.id (from auth.users)
--   2. org_id is left NULL — organization assignment is a business concern
--      handled separately by admin or application logic
--   3. ON CONFLICT (id) DO NOTHING ensures idempotency
--
-- FAILURE:
--   If profile creation fails for ANY reason, RAISE EXCEPTION rolls back
--   the entire transaction including the auth.users INSERT. Signup fails.
--   This guarantees ZERO orphaned users. The frontend receives a 500 error
--   and should display a "signup failed" message.
--
-- FUTURE:
--   004_rbac.sql will CREATE OR REPLACE this function to also insert into
--   user_roles (assigning the default student role).
--
-- SECURITY:
--   SECURITY DEFINER: Executes as the function owner (postgres), bypassing
--   RLS to insert the profile row. Without this, RLS would block the insert
--   because the user doesn't have a profile yet (chicken-and-egg).
--
--   search_path = public, pg_temp: Prevents schema injection attacks.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        metadata
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        new.email,
        COALESCE(new.raw_user_meta_data->>'phone', NULL),
        COALESCE(new.raw_user_meta_data, '{}'::jsonb)::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Enterprise Auth: Failed to provision profile for user %: %', new.id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.handle_new_user IS 'Auth trigger: provisions public.profiles on signup. Org assignment is deferred. Updated in 004_rbac.sql to also assign the default student role.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECTION 7: Row Level Security
-- ============================================================================
-- POLICY DESIGN:
--   USING:      Controls which rows the user can see / select for mutation.
--   WITH CHECK: Controls which row VALUES are allowed after INSERT/UPDATE.
--               Prevents a user from changing their id to impersonate another.
--
--   No INSERT policies on profiles: only the SECURITY DEFINER trigger creates
--   profile rows. Frontend inserts are architecturally forbidden.
--
--   No DELETE policies: soft delete via deleted_at. Physical deletion is
--   restricted to admin-level SECURITY DEFINER functions (added later).
--
--   Admin bypass policies require user_roles (created in 004_rbac.sql).
-- ============================================================================

-- organizations --
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active organizations"
    ON public.organizations FOR SELECT
    USING (status = 'active');

-- profiles --
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- mentor_profiles --
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mentor profiles"
    ON public.mentor_profiles FOR SELECT
    USING (true);

CREATE POLICY "Mentors can update their own mentor profile"
    ON public.mentor_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- student_profiles --
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own student profile"
    ON public.student_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Students can update their own student profile"
    ON public.student_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SECTION 8: Verification
-- ============================================================================
-- Structural verification only. Functional testing (signup → profile created)
-- must be performed at the application level because auth.users rows cannot
-- be safely inserted via raw SQL in Supabase.
--
-- Checks:
--   1. All 4 tables exist
--   2. All 4 primary keys exist
--   3. All 4 foreign keys exist
--   4. All 4 named indexes exist
--   5. Auth trigger exists on auth.users
--   6. handle_new_user() is SECURITY DEFINER
--   7. RLS enabled on all 4 tables
--   8. At least 6 RLS policies exist
--   9. updated_at triggers on all 4 business tables
-- ============================================================================

DO $$
DECLARE
    _count int;
BEGIN
    -- 1. Tables
    SELECT COUNT(*) INTO _count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('organizations', 'profiles', 'mentor_profiles', 'student_profiles');
    IF _count != 4 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected 4 identity tables, found %', _count;
    END IF;

    -- 2. Primary keys
    SELECT COUNT(*) INTO _count
    FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid IN (
          'public.organizations'::regclass,
          'public.profiles'::regclass,
          'public.mentor_profiles'::regclass,
          'public.student_profiles'::regclass
      );
    IF _count != 4 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected 4 primary keys, found %', _count;
    END IF;

    -- 3. Foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_auth_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: profiles_auth_fk (profiles.id → auth.users.id) not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_org_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: profiles_org_fk (profiles.org_id → organizations.id) not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentor_profiles_profile_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: mentor_profiles_profile_fk not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_profile_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: student_profiles_profile_fk not found';
    END IF;

    -- 4. Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_email') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_profiles_email not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_org_id') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_profiles_org_id not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_active') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_profiles_active not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mentor_profiles_verified') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_mentor_profiles_verified not found';
    END IF;

    -- 5. Auth trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
    ) THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: on_auth_user_created trigger not found on auth.users';
    END IF;

    -- 6. SECURITY DEFINER
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'handle_new_user'
          AND n.nspname = 'public'
          AND p.prosecdef = true
    ) THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: handle_new_user() not found or not SECURITY DEFINER';
    END IF;

    -- 7. RLS enabled
    SELECT COUNT(*) INTO _count
    FROM pg_class
    WHERE relname IN ('organizations', 'profiles', 'mentor_profiles', 'student_profiles')
      AND relnamespace = 'public'::regnamespace
      AND relrowsecurity = true;
    IF _count != 4 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: RLS not enabled on all identity tables. Enabled on % of 4.', _count;
    END IF;

    -- 8. Policies
    SELECT COUNT(*) INTO _count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('organizations', 'profiles', 'mentor_profiles', 'student_profiles');
    IF _count < 6 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected at least 6 RLS policies, found %', _count;
    END IF;

    -- 9. updated_at triggers
    SELECT COUNT(*) INTO _count
    FROM pg_trigger
    WHERE tgname = 'set_updated_at'
      AND tgrelid IN (
          'public.organizations'::regclass,
          'public.profiles'::regclass,
          'public.mentor_profiles'::regclass,
          'public.student_profiles'::regclass
      );
    IF _count != 4 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected 4 updated_at triggers, found %', _count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  003_identity.sql — VERIFICATION PASSED';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  Tables:          4';
    RAISE NOTICE '  Primary Keys:    4';
    RAISE NOTICE '  Foreign Keys:    4';
    RAISE NOTICE '  Indexes:         4';
    RAISE NOTICE '  Auth Trigger:    on_auth_user_created (SECURITY DEFINER)';
    RAISE NOTICE '  RLS:             Enabled on all tables';
    RAISE NOTICE '  Policies:        % (USING + WITH CHECK on updates)', _count;
    RAISE NOTICE '  updated_at:      Attached to all 4 tables';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
    RAISE NOTICE '  NEXT: Test signup via the application.';
    RAISE NOTICE '  THEN: SELECT id, email, org_id FROM public.profiles;';
    RAISE NOTICE '';
END;
$$;

COMMIT;
