-- =============================================================================
-- Migration: 20260718000007_permissions_and_roles.sql
-- Version:   1.0.0
-- Description:
--   Creates core permissions tables for RBAC and ABAC.
--   Tables: permissions, role_permissions, user_permissions.
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Permissions
-- ============================================================================
DROP TABLE IF EXISTS public.permissions CASCADE;
CREATE TABLE public.permissions (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                    text NOT NULL UNIQUE, -- e.g., 'mentor.course.read'
    name                    text NOT NULL,
    description             text,
    module                  text NOT NULL, -- e.g., 'course', 'student', 'crm'
    
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_permissions_slug ON public.permissions(slug);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);

DROP TRIGGER IF EXISTS set_updated_at ON public.permissions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone views active permissions" ON public.permissions FOR SELECT
    USING (is_active = true OR public.has_role('super_admin') OR public.has_role('admin'));
CREATE POLICY "Admins manage permissions" ON public.permissions FOR ALL
    USING (public.has_role('super_admin'));


-- ============================================================================
-- SECTION 2: Role Permissions
-- ============================================================================
DROP TABLE IF EXISTS public.role_permissions CASCADE;
CREATE TABLE public.role_permissions (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id                 uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id           uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz,
    
    UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON public.role_permissions(permission_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.role_permissions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.role_permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone views role permissions" ON public.role_permissions FOR SELECT
    USING (is_active = true OR public.has_role('super_admin') OR public.has_role('admin'));
CREATE POLICY "Admins manage role permissions" ON public.role_permissions FOR ALL
    USING (public.has_role('super_admin') OR public.has_role('admin'));


-- ============================================================================
-- SECTION 3: User Permissions (Overrides)
-- ============================================================================
DROP TABLE IF EXISTS public.user_permissions CASCADE;
CREATE TABLE public.user_permissions (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_id           uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    is_granted              boolean NOT NULL DEFAULT true, -- Allows explicit revoking of a role permission
    
    is_active               boolean NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at              timestamptz,
    
    UNIQUE (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_perm ON public.user_permissions(permission_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.user_permissions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own permission overrides" ON public.user_permissions FOR SELECT
    USING (user_id = auth.uid() OR public.has_role('super_admin') OR public.has_role('admin'));
CREATE POLICY "Admins manage user permissions" ON public.user_permissions FOR ALL
    USING (public.has_role('super_admin') OR public.has_role('admin'));

-- ============================================================================
-- RPC: current_user_permissions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_user_permissions()
RETURNS SETOF text
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT p.slug
  FROM public.permissions p
  JOIN public.role_permissions rp ON rp.permission_id = p.id
  JOIN public.user_roles ur ON ur.role_id = rp.role_id
  WHERE ur.user_id = auth.uid()
    AND p.is_active = true
    AND rp.is_active = true
    -- Exclude if explicitly revoked
    AND NOT EXISTS (
      SELECT 1 FROM public.user_permissions up 
      WHERE up.user_id = auth.uid() AND up.permission_id = p.id AND up.is_granted = false
    )
  UNION
  SELECT p.slug
  FROM public.permissions p
  JOIN public.user_permissions up ON up.permission_id = p.id
  WHERE up.user_id = auth.uid()
    AND up.is_granted = true
    AND p.is_active = true
    AND up.is_active = true;
$$;

COMMIT;
