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
    WHERE p.id = _uid AND o.status = 'active';

    -- 3. Roles
    SELECT COALESCE(ARRAY_AGG(r.code), '{}'::text[]) INTO _roles
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _uid AND ur.revoked_at IS NULL;

    -- 4. Permissions (use p.slug now instead of p.code)
    SELECT COALESCE(ARRAY_AGG(DISTINCT p.slug), '{}'::text[]) INTO _permissions
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

COMMIT;
