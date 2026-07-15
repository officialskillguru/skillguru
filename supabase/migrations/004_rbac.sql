-- =============================================================================
-- Migration: 004_rbac.sql
-- Version:   1.0.0
-- Description:
--   Creates the Role-Based Access Control domain for SkillGuru.
--
--   Tables: roles, permissions, role_permissions, user_roles
--   Functions: has_role(), has_permission(), get_current_roles(),
--              get_current_permissions()
--   Seed: 3 roles, 29 permissions (Phase A), role_permission mappings
--   Trigger: Updates handle_new_user() to assign default student role
--   Backfill: Assigns student role to all existing users without roles
--
-- Dependencies:
--   001_extensions.sql
--   002_enums.sql
--   003_identity.sql (profiles, organizations, set_updated_at)
--
-- Rollback:
--   Not automatic. Requires:
--   1. Restore handle_new_user() from 003 version (profile only, no role)
--   2. DROP policies referencing has_role() on identity tables
--   3. DROP FUNCTION has_role, has_permission, get_current_roles,
--      get_current_permissions CASCADE
--   4. DROP TABLE user_roles, role_permissions, permissions, roles CASCADE
--   WARNING: This breaks all admin RLS policies on identity tables.
--
-- Author:
--   SkillGuru Platform Engineering
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: roles
-- ============================================================================
-- WHY: Formalized RBAC. Avoids storing "role" as a text column on profiles,
--      which doesn't scale to multiple roles per user, role hierarchy, or
--      granular permissions.
-- DESIGN:
--   - `code` is the machine-stable identifier. Used in triggers, functions,
--     and RLS policies. NEVER rename a code after deployment.
--   - `name` is the human-readable display name. Safe to rename in admin UI.
-- GROWTH: 3-10 roles. Never high-volume.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            text NOT NULL,
    name            text NOT NULL,
    description     text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    created_by      uuid,
    updated_by      uuid,

    CONSTRAINT roles_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.roles IS 'System roles. A user can hold multiple roles simultaneously (e.g., mentor + student).';
COMMENT ON COLUMN public.roles.code IS 'Machine-stable identifier. Used in triggers, functions, and RLS policies. Never rename after deployment.';
COMMENT ON COLUMN public.roles.name IS 'Human-readable display name shown in admin UI. Safe to rename.';

DROP TRIGGER IF EXISTS set_updated_at ON public.roles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 2: permissions
-- ============================================================================
-- WHY: Granular, auditable access control. Every protected action maps to
--      a permission. RLS policies call has_permission() instead of
--      hardcoding role names.
-- NAMING CONVENTION:
--   {module}.{verb}           — e.g., courses.create
--   {module}.{verb}_{scope}   — e.g., profiles.view_own, profiles.view_all
--   Verbs: view, create, update, delete, manage, publish, issue, send,
--          attempt, upload
--   Scopes: own (user's records), all (admin-level)
-- GROWTH: 30-100 permissions. New domain migrations add their own.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            text NOT NULL,
    display_name    text NOT NULL,
    description     text,
    module          text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    created_by      uuid,
    updated_by      uuid,

    CONSTRAINT permissions_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.permissions IS 'Granular system permissions. Each protected action maps to a permission code.';
COMMENT ON COLUMN public.permissions.code IS 'Machine-stable identifier. Format: {module}.{verb}_{scope}. Used in has_permission() calls.';
COMMENT ON COLUMN public.permissions.display_name IS 'Human-readable name for admin UI. Example: "View Own Profile".';
COMMENT ON COLUMN public.permissions.module IS 'Domain grouping for admin UI filtering. Example: "profiles", "courses", "system".';

CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);

DROP TRIGGER IF EXISTS set_updated_at ON public.permissions;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 3: role_permissions (junction)
-- ============================================================================
-- WHY: Maps permissions to roles. This is the source of truth for what
--      each role is allowed to do.
-- DESIGN: Composite PK prevents duplicate mappings.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id         uuid NOT NULL,
    permission_id   uuid NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid,

    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT rp_role_fk FOREIGN KEY (role_id)
        REFERENCES public.roles(id) ON DELETE CASCADE,
    CONSTRAINT rp_permission_fk FOREIGN KEY (permission_id)
        REFERENCES public.permissions(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.role_permissions IS 'Maps permissions to roles. Source of truth for role capabilities.';

-- ============================================================================
-- SECTION 4: user_roles (junction)
-- ============================================================================
-- WHY: Maps roles to users. A user can hold multiple roles.
-- DESIGN:
--   - `assigned_by` tracks who granted the role (NULL = system/trigger)
--   - `revoked_at` enables soft-revocation. Active roles have revoked_at IS NULL.
--     To re-activate a revoked role, set revoked_at back to NULL.
--   - PK (user_id, role_id) ensures one record per user-role pair.
--     Full assignment history is tracked in audit_logs, not here.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id         uuid NOT NULL,
    role_id         uuid NOT NULL,
    assigned_by     uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    revoked_at      timestamptz,

    PRIMARY KEY (user_id, role_id),
    CONSTRAINT ur_user_fk FOREIGN KEY (user_id)
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT ur_role_fk FOREIGN KEY (role_id)
        REFERENCES public.roles(id) ON DELETE CASCADE,
    CONSTRAINT ur_assigned_by_fk FOREIGN KEY (assigned_by)
        REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.user_roles IS 'Maps roles to users. Active roles have revoked_at IS NULL.';
COMMENT ON COLUMN public.user_roles.assigned_by IS 'Who granted this role. NULL = system/trigger assignment.';
COMMENT ON COLUMN public.user_roles.revoked_at IS 'When set, the role is inactive. Set to NULL to re-activate.';

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id)
    WHERE revoked_at IS NULL;

-- ============================================================================
-- SECTION 5: Helper Functions
-- ============================================================================
-- WHY: RLS policies call these to check access. Centralizes authorization
--      logic in four functions instead of scattering joins across every policy.
-- SECURITY:
--   - SECURITY DEFINER: Executes as function owner, bypassing RLS on
--     user_roles/role_permissions. Prevents infinite recursion where
--     a policy calls has_role() which tries to read user_roles which
--     triggers the policy which calls has_role()...
--   - search_path = public, pg_temp: Prevents schema injection.
-- ============================================================================

-- has_role: checks if the current user holds a specific role (by code)
CREATE OR REPLACE FUNCTION public.has_role(_role_code text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.code = _role_code
          AND ur.revoked_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.has_role(text) IS 'Returns true if auth.uid() holds the specified role (by code) and it has not been revoked.';

-- has_permission: checks if the current user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_permission_code text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()
          AND p.code = _permission_code
          AND ur.revoked_at IS NULL
          AND p.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.has_permission(text) IS 'Returns true if auth.uid() holds any role that grants the specified permission.';

-- get_current_roles: returns all active role codes for the current user
CREATE OR REPLACE FUNCTION public.get_current_roles()
RETURNS text[] AS $$
DECLARE
    _roles text[];
BEGIN
    SELECT COALESCE(ARRAY_AGG(r.code), '{}'::text[]) INTO _roles
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL;

    RETURN _roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.get_current_roles() IS 'Returns array of active role codes for auth.uid(). Used by frontend to determine UI capabilities.';

-- get_current_permissions: returns all active permission codes for the current user
CREATE OR REPLACE FUNCTION public.get_current_permissions()
RETURNS text[] AS $$
DECLARE
    _permissions text[];
BEGIN
    SELECT COALESCE(ARRAY_AGG(DISTINCT p.code), '{}'::text[]) INTO _permissions
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL
      AND p.deleted_at IS NULL;

    RETURN _permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.get_current_permissions() IS 'Returns array of all active permission codes for auth.uid(). Used by frontend for feature gating.';

-- ============================================================================
-- SECTION 6: Seed Roles (Infrastructure Data)
-- ============================================================================
-- WHY: The auth trigger assigns the default student role. These rows MUST
--      exist for signup to work. This is infrastructure, not demo data.
-- CONVENTION: Schema + mandatory data live together. Optional data in seed.sql.
-- ============================================================================

INSERT INTO public.roles (code, name, description) VALUES
    ('admin',   'Administrator', 'Full system access. Can manage all users, courses, payments, and system settings.'),
    ('mentor',  'Mentor',        'Can create and manage courses, view enrolled students, and receive payouts.'),
    ('student', 'Student',       'Can browse courses, enroll, consume content, take quizzes, and earn certificates.')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SECTION 7: Seed Permissions (Phase A)
-- ============================================================================
-- WHY: Permissions are the atomic unit of authorization. Without them,
--      has_permission() always returns false and permission-driven RLS
--      is non-functional.
-- CONVENTION: Each future domain migration adds its own permissions.
--      This seed covers only the permissions known at Phase A launch.
-- ============================================================================

INSERT INTO public.permissions (code, display_name, module, description) VALUES
    -- profiles module
    ('profiles.view_own',    'View Own Profile',    'profiles',      'View own profile data'),
    ('profiles.update_own',  'Update Own Profile',  'profiles',      'Update own profile data'),
    ('profiles.view_all',    'View All Profiles',   'profiles',      'View any user profile (admin)'),
    ('profiles.update_all',  'Update All Profiles', 'profiles',      'Update any user profile (admin)'),
    ('profiles.delete',      'Delete Profile',      'profiles',      'Soft-delete any user profile (admin)'),

    -- roles module
    ('roles.manage',         'Manage Roles',        'roles',         'Assign and revoke roles for any user'),

    -- courses module
    ('courses.create',       'Create Course',       'courses',       'Create new courses'),
    ('courses.view',         'View Courses',        'courses',       'View published and own draft courses'),
    ('courses.update_own',   'Update Own Courses',  'courses',       'Update own courses'),
    ('courses.update_all',   'Update All Courses',  'courses',       'Update any course (admin)'),
    ('courses.delete',       'Delete Course',       'courses',       'Soft-delete any course (admin)'),
    ('courses.publish',      'Publish Course',      'courses',       'Change course status to published (admin)'),

    -- enrollments module
    ('enrollments.create',   'Enroll in Course',    'enrollments',   'Enroll self in a course'),
    ('enrollments.view_own', 'View Own Enrollments','enrollments',   'View own enrollment records'),
    ('enrollments.view_all', 'View All Enrollments','enrollments',   'View all enrollment records (admin)'),

    -- payments module
    ('payments.view_own',    'View Own Payments',   'payments',      'View own payment history'),
    ('payments.view_all',    'View All Payments',   'payments',      'View all payment records (admin)'),

    -- files module
    ('files.upload',         'Upload Files',        'files',         'Upload files to storage'),
    ('files.view_own',       'View Own Files',      'files',         'View own uploaded files'),
    ('files.view_all',       'View All Files',      'files',         'View all files in the system (admin)'),
    ('files.delete_own',     'Delete Own Files',    'files',         'Delete own uploaded files'),

    -- quizzes module
    ('quizzes.create',       'Create Quiz',         'quizzes',       'Create quizzes for courses'),
    ('quizzes.attempt',      'Attempt Quiz',        'quizzes',       'Take a quiz as a student'),

    -- certificates module
    ('certificates.view_own','View Own Certificates','certificates', 'View own earned certificates'),
    ('certificates.issue',   'Issue Certificate',   'certificates',  'Issue certificates to students'),

    -- notifications module
    ('notifications.send',     'Send Notifications',  'notifications','Send notifications to users'),
    ('notifications.view_own', 'View Own Notifications','notifications','View own notifications'),

    -- system module
    ('system.settings',      'Manage Settings',     'system',        'View and modify system settings'),
    ('system.audit_logs',    'View Audit Logs',     'system',        'View system audit logs')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SECTION 8: Seed Role-Permission Mappings
-- ============================================================================

-- Admin: gets ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Mentor: course creation, own content management, payouts
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'mentor'
  AND p.code IN (
      'profiles.view_own',    'profiles.update_own',
      'courses.create',       'courses.view',          'courses.update_own',
      'enrollments.view_own',
      'payments.view_own',
      'files.upload',         'files.view_own',        'files.delete_own',
      'quizzes.create',
      'certificates.view_own',
      'notifications.send',   'notifications.view_own'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Student: content consumption, enrollment, quizzes
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'student'
  AND p.code IN (
      'profiles.view_own',    'profiles.update_own',
      'courses.view',
      'enrollments.create',   'enrollments.view_own',
      'payments.view_own',
      'files.upload',         'files.view_own',        'files.delete_own',
      'quizzes.attempt',
      'certificates.view_own',
      'notifications.view_own'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- SECTION 9: Update Auth Trigger
-- ============================================================================
-- WHY: Now that user_roles exists, new users should automatically receive
--      the default student role on signup.
-- CHANGE FROM 003:
--   - Adds student role assignment after profile creation
--   - Uses roles.code (stable) not roles.name (mutable) for lookup
--   - ON CONFLICT DO UPDATE SET revoked_at = NULL handles edge case
--     where a revoked role is re-assigned
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    _student_role_id uuid;
BEGIN
    -- 1. Provision the profile
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

    -- 2. Get the default student role by stable code
    SELECT id INTO _student_role_id
    FROM public.roles
    WHERE code = 'student'
    LIMIT 1;

    IF _student_role_id IS NULL THEN
        RAISE EXCEPTION 'Enterprise Auth: Default role code "student" not found. Ensure 004_rbac.sql seed data was applied.';
    END IF;

    -- 3. Assign student role (re-activates if previously revoked)
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (new.id, _student_role_id)
    ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Enterprise Auth: Failed to provision user %: %', new.id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.handle_new_user IS 'Auth trigger: provisions profile and assigns default student role on signup. Uses roles.code for stable lookup.';

-- ============================================================================
-- SECTION 10: Backfill Existing Users
-- ============================================================================
-- WHY: Users created before 004_rbac.sql have profiles but no roles.
--      This idempotent backfill assigns the student role to every profile
--      that does not already have an active role assignment.
-- ============================================================================

DO $$
DECLARE
    _student_role_id uuid;
    _backfill_count int;
BEGIN
    SELECT id INTO _student_role_id
    FROM public.roles WHERE code = 'student';

    IF _student_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        SELECT p.id, _student_role_id
        FROM public.profiles p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p.id
              AND ur.role_id = _student_role_id
              AND ur.revoked_at IS NULL
        )
        ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;

        GET DIAGNOSTICS _backfill_count = ROW_COUNT;
        RAISE NOTICE 'Backfill: Assigned student role to % existing profile(s)', _backfill_count;
    END IF;
END;
$$;

-- ============================================================================
-- SECTION 11: Row Level Security
-- ============================================================================
-- DESIGN:
--   roles, permissions, role_permissions: publicly readable (needed by
--   frontend for UI capability rendering). Only admins can mutate.
--
--   user_roles: users can read their own. Admins can manage all.
-- ============================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- roles: read-only for everyone
CREATE POLICY "Anyone can read roles"
    ON public.roles FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage roles"
    ON public.roles FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

-- permissions: read-only for everyone
CREATE POLICY "Anyone can read permissions"
    ON public.permissions FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage permissions"
    ON public.permissions FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

-- role_permissions: read-only for everyone
CREATE POLICY "Anyone can read role_permissions"
    ON public.role_permissions FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage role_permissions"
    ON public.role_permissions FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

-- user_roles: users read own, admins manage all
CREATE POLICY "Users can read their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user_roles"
    ON public.user_roles FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

-- ============================================================================
-- SECTION 12: Admin Bypass Policies for Identity Domain
-- ============================================================================
-- WHY: 003_identity.sql created self-access policies only. Now that RBAC
--      exists, admins need full access to manage users.
-- ============================================================================

CREATE POLICY "Admins can manage all organizations"
    ON public.organizations FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

CREATE POLICY "Admins can manage all mentor_profiles"
    ON public.mentor_profiles FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

CREATE POLICY "Admins can manage all student_profiles"
    ON public.student_profiles FOR ALL
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));

-- ============================================================================
-- SECTION 13: Verification
-- ============================================================================

DO $$
DECLARE
    _count int;
    _test_result boolean;
    _test_roles text[];
    _test_perms text[];
BEGIN
    -- ---- STRUCTURAL VERIFICATION ----

    -- 1. Tables exist
    SELECT COUNT(*) INTO _count FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles');
    IF _count != 4 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected 4 RBAC tables, found %', _count;
    END IF;

    -- 2. Primary keys
    SELECT COUNT(*) INTO _count FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid IN (
          'public.roles'::regclass,
          'public.permissions'::regclass,
          'public.role_permissions'::regclass,
          'public.user_roles'::regclass
      );
    IF _count != 4 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected 4 primary keys, found %', _count;
    END IF;

    -- 3. Foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rp_role_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: rp_role_fk not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rp_permission_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: rp_permission_fk not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ur_user_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: ur_user_fk not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ur_role_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: ur_role_fk not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ur_assigned_by_fk') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: ur_assigned_by_fk not found';
    END IF;

    -- 4. Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_user_id') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_user_roles_user_id not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_active') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_user_roles_active not found';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_permissions_module') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: idx_permissions_module not found';
    END IF;

    -- 5. Helper functions exist and are SECURITY DEFINER
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'has_role' AND n.nspname = 'public' AND p.prosecdef = true
    ) THEN RAISE EXCEPTION 'VERIFICATION FAILED: has_role() not found or not SECURITY DEFINER'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'has_permission' AND n.nspname = 'public' AND p.prosecdef = true
    ) THEN RAISE EXCEPTION 'VERIFICATION FAILED: has_permission() not found or not SECURITY DEFINER'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'get_current_roles' AND n.nspname = 'public' AND p.prosecdef = true
    ) THEN RAISE EXCEPTION 'VERIFICATION FAILED: get_current_roles() not found or not SECURITY DEFINER'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'get_current_permissions' AND n.nspname = 'public' AND p.prosecdef = true
    ) THEN RAISE EXCEPTION 'VERIFICATION FAILED: get_current_permissions() not found or not SECURITY DEFINER'; END IF;

    -- 6. Seed data: roles
    SELECT COUNT(*) INTO _count FROM public.roles
    WHERE code IN ('admin', 'mentor', 'student') AND deleted_at IS NULL;
    IF _count != 3 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected 3 default roles, found %', _count;
    END IF;

    -- 7. Seed data: permissions
    SELECT COUNT(*) INTO _count FROM public.permissions WHERE deleted_at IS NULL;
    IF _count < 29 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected at least 29 permissions, found %', _count;
    END IF;

    -- 8. Seed data: role_permissions
    SELECT COUNT(*) INTO _count FROM public.role_permissions;
    IF _count < 40 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected at least 40 role_permission mappings, found %', _count;
    END IF;

    -- 9. RLS enabled
    SELECT COUNT(*) INTO _count FROM pg_class
    WHERE relname IN ('roles', 'permissions', 'role_permissions', 'user_roles')
      AND relnamespace = 'public'::regnamespace
      AND relrowsecurity = true;
    IF _count != 4 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: RLS not enabled on all RBAC tables. Enabled on % of 4', _count;
    END IF;

    -- 10. RLS policies exist
    SELECT COUNT(*) INTO _count FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles');
    IF _count < 8 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected at least 8 RBAC policies, found %', _count;
    END IF;

    -- 11. updated_at triggers
    SELECT COUNT(*) INTO _count FROM pg_trigger
    WHERE tgname = 'set_updated_at'
      AND tgrelid IN ('public.roles'::regclass, 'public.permissions'::regclass);
    IF _count != 2 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected 2 updated_at triggers on roles/permissions, found %', _count;
    END IF;

    -- 12. Auth trigger still SECURITY DEFINER
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'handle_new_user' AND n.nspname = 'public' AND p.prosecdef = true
    ) THEN RAISE EXCEPTION 'VERIFICATION FAILED: handle_new_user() lost SECURITY DEFINER'; END IF;

    -- ---- BEHAVIORAL VERIFICATION ----
    -- (No auth context: auth.uid() returns NULL)

    -- 13. has_role returns false for unauthenticated context
    SELECT public.has_role('admin') INTO _test_result;
    IF _test_result IS NOT false THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: has_role should return false without auth context';
    END IF;

    -- 14. has_permission returns false for unauthenticated context
    SELECT public.has_permission('profiles.view_own') INTO _test_result;
    IF _test_result IS NOT false THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: has_permission should return false without auth context';
    END IF;

    -- 15. get_current_roles returns empty array without auth context
    SELECT public.get_current_roles() INTO _test_roles;
    IF _test_roles != '{}'::text[] THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: get_current_roles should return empty array without auth context';
    END IF;

    -- 16. get_current_permissions returns empty array without auth context
    SELECT public.get_current_permissions() INTO _test_perms;
    IF _test_perms != '{}'::text[] THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: get_current_permissions should return empty array without auth context';
    END IF;

    -- 17. Admin has more permissions than student (sanity check on mapping)
    DECLARE
        _admin_perms int;
        _student_perms int;
    BEGIN
        SELECT COUNT(*) INTO _admin_perms FROM public.role_permissions rp
        JOIN public.roles r ON rp.role_id = r.id WHERE r.code = 'admin';
        SELECT COUNT(*) INTO _student_perms FROM public.role_permissions rp
        JOIN public.roles r ON rp.role_id = r.id WHERE r.code = 'student';
        IF _admin_perms <= _student_perms THEN
            RAISE EXCEPTION 'VERIFICATION FAILED: Admin should have more permissions than student (admin=%, student=%)', _admin_perms, _student_perms;
        END IF;
    END;

    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  004_rbac.sql — VERIFICATION PASSED';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  Tables:          4 (roles, permissions, role_permissions, user_roles)';
    RAISE NOTICE '  Primary Keys:    4';
    RAISE NOTICE '  Foreign Keys:    5 (rp_role, rp_permission, ur_user, ur_role, ur_assigned_by)';
    RAISE NOTICE '  Indexes:         3 (user_roles_user_id, user_roles_active, permissions_module)';
    RAISE NOTICE '  Functions:       4 (has_role, has_permission, get_current_roles, get_current_permissions)';
    RAISE NOTICE '  Roles Seeded:    3 (admin, mentor, student)';
    RAISE NOTICE '  Permissions:     29 across 9 modules';
    RAISE NOTICE '  RLS:             Enabled on all 4 tables';
    RAISE NOTICE '  Behavioral:      4 unauthenticated tests passed';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
END;
$$;

COMMIT;
