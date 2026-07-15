-- =============================================================================
-- Migration: 004a_identity_rpc.sql
-- Version:   1.0.0
-- Description:
--   Creates get_current_identity() RPC to return a comprehensive
--   single-request identity payload containing profile, roles, permissions,
--   and sub-profiles.
--
-- Dependencies:
--   003_identity.sql
--   004_rbac.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_current_identity()
RETURNS jsonb AS $$
DECLARE
    _uid uuid := auth.uid();
    _profile jsonb;
    _roles text[];
    _permissions text[];
    _org jsonb;
    _mentor_profile jsonb;
    _student_profile jsonb;
BEGIN
    IF _uid IS NULL THEN
        RETURN NULL;
    END IF;

    -- 1. Profile
    SELECT to_jsonb(p) INTO _profile
    FROM public.profiles p
    WHERE p.id = _uid AND p.deleted_at IS NULL;

    IF _profile IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Organization
    SELECT to_jsonb(o) INTO _org
    FROM public.profiles p
    JOIN public.organizations o ON p.org_id = o.id
    WHERE p.id = _uid AND o.deleted_at IS NULL;

    -- 3. Roles
    SELECT COALESCE(ARRAY_AGG(r.code), '{}'::text[]) INTO _roles
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _uid AND ur.revoked_at IS NULL;

    -- 4. Permissions
    SELECT COALESCE(ARRAY_AGG(DISTINCT p.code), '{}'::text[]) INTO _permissions
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _uid AND ur.revoked_at IS NULL AND p.deleted_at IS NULL;

    -- 5. Mentor Profile
    SELECT to_jsonb(mp) INTO _mentor_profile
    FROM public.mentor_profiles mp
    WHERE mp.id = _uid;

    -- 6. Student Profile
    SELECT to_jsonb(sp) INTO _student_profile
    FROM public.student_profiles sp
    WHERE sp.id = _uid;

    -- 7. Assemble
    RETURN jsonb_build_object(
        'profile', _profile,
        'organization', _org,
        'roles', _roles,
        'permissions', _permissions,
        'mentor_profile', _mentor_profile,
        'student_profile', _student_profile
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.get_current_identity() IS 'Returns a composite JSON object containing the user profile, active roles, permissions, organization, and domain profiles. Reduces client-side network roundtrips.';

-- Verify function exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_identity') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: get_current_identity function not found';
    END IF;
    
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '  004a_identity_rpc.sql — VERIFICATION PASSED';
    RAISE NOTICE '=========================================================';
END;
$$;

COMMIT;
