-- Restore RBAC permission functions + course permissions that the original
-- production project had but which were never captured in migrations.
--
-- 004_rbac.sql defined has_permission()/get_current_permissions() against
-- permissions.code. 20260718000007_permissions_and_roles.sql then dropped and
-- recreated `permissions` with a `slug` column (and no `code`), without
-- updating those functions. Production had been patched by hand to use
-- p.slug (documented in supabase/tests/course_status_rls.test.sql, confirmed
-- there via pg_get_functiondef against the live project). On a project built
-- purely from migrations, every RLS policy that calls has_permission() raised
-- 42703 "column p.code does not exist" - 36 policies, including the only
-- admin write policy on lessons/modules/resources and mentor course
-- create/update.
--
-- Production also had courses.* permission rows that no migration seeds
-- (same test file). Without them mentors cannot create or edit their own
-- courses even once has_permission() works.
--
-- get_unread_notification_count() filtered on notifications.status, which
-- does not exist (the table uses is_read). Its EXECUTE was revoked from
-- PUBLIC/anon on production as a security fix (docs/DATABASE.md §4) because
-- it accepts an arbitrary user id; that revoke is re-applied here.
--
-- All statements are idempotent (CREATE OR REPLACE / ON CONFLICT DO NOTHING).

CREATE OR REPLACE FUNCTION public.has_permission(_permission_code text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()
          AND p.slug = _permission_code
          AND ur.revoked_at IS NULL
          AND p.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_current_permissions()
RETURNS text[] AS $$
DECLARE
    _permissions text[];
BEGIN
    SELECT COALESCE(ARRAY_AGG(DISTINCT p.slug), '{}'::text[]) INTO _permissions
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL
      AND p.deleted_at IS NULL;

    RETURN _permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid DEFAULT auth.uid())
RETURNS int AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::int
        FROM public.notifications
        WHERE recipient_id = p_user_id
          AND is_read IS NOT TRUE
          AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_unread_notification_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calculate_profile_completion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(uuid) TO authenticated;

-- Course permissions referenced by RLS policies (courses, modules, lessons,
-- resources, course_faqs, course_media).
INSERT INTO public.permissions (slug, name, module, description) VALUES
  ('courses.create',     'Create Course',      'courses', 'Create new courses'),
  ('courses.view',       'View Courses',       'courses', 'View published and own draft courses'),
  ('courses.update_own', 'Update Own Courses', 'courses', 'Update own courses'),
  ('courses.update_all', 'Update All Courses', 'courses', 'Update any course (admin)'),
  ('courses.publish',    'Publish Course',     'courses', 'Change course status to published (admin)')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  _mentor_role uuid;
  _admin_role  uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role  FROM public.roles WHERE code = 'admin';

  IF _mentor_role IS NULL OR _admin_role IS NULL THEN
    RAISE EXCEPTION 'roles admin/mentor missing - 004_rbac.sql seed not applied';
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT _mentor_role, p.id FROM public.permissions p
  WHERE p.slug IN ('courses.create', 'courses.view', 'courses.update_own')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT _admin_role, p.id FROM public.permissions p
  WHERE p.slug IN ('courses.create', 'courses.view', 'courses.update_own', 'courses.update_all', 'courses.publish')
  ON CONFLICT DO NOTHING;
END $$;
