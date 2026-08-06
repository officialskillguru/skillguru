-- ============================================================================
-- Mentor category proposals: additive on top of Phase A
-- (20260806000001_category_taxonomy_governance.sql, NOT modified here).
-- ============================================================================
-- WHY: Phase A introduced categories.status but deliberately left INSERT
--      admin-only. This migration adds the mentor proposal path: a mentor
--      may propose a new category/subcategory, but it must always land as
--      status='pending' - never directly selectable/public - until an admin
--      approves it. Mirrors the exact defense-in-depth pattern already
--      proven for courses (20260805000001_enforce_course_status_transitions.sql):
--      RLS decides *whether* a mentor can insert at all; a trigger decides
--      *what status/ownership that insert is allowed to land as*, and the
--      trigger enforces this even if a buggy or malicious client sends a
--      different value - never trust the client-supplied status/created_by.
--
-- Admin's existing full authority (has_role('admin') branch on every
-- consolidated_* policy from Phase A) is completely unchanged.
-- ============================================================================

-- SECTION 1: categories.propose permission, granted to the mentor role
-- ----------------------------------------------------------------------------
INSERT INTO public.permissions (slug, name, module, description) VALUES
    ('categories.propose', 'Propose Category', 'courses', 'Propose a new course category/subcategory for admin review')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _perm_id uuid;
BEGIN
    SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
    SELECT id INTO _perm_id FROM public.permissions WHERE slug = 'categories.propose';
    IF _mentor_role IS NOT NULL AND _perm_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (_mentor_role, _perm_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- SECTION 2: RLS - a mentor must be able to see their OWN proposal
-- ----------------------------------------------------------------------------
-- Without this, PostgREST's INSERT ... RETURNING (return=representation)
-- would come back empty even on a successful insert, because Phase A's
-- consolidated_select only allows non-admins to see status='active' rows -
-- a brand-new 'pending' proposal wouldn't be visible even to its own author.
-- Narrow and additive: only the proposal's own creator can see it while
-- pending/rejected; another mentor still cannot (falls through to Phase A's
-- existing status='active' branch, which a pending/rejected row never
-- matches). Admin visibility (has_role('admin')) is unchanged.
DROP POLICY IF EXISTS consolidated_select ON public.categories;
CREATE POLICY consolidated_select ON public.categories FOR SELECT
USING (
    has_role('admin')
    OR (deleted_at IS NULL AND status = 'active')
    OR (deleted_at IS NULL AND created_by = auth.uid())
);

-- SECTION 3: RLS - allow a categories.propose holder to insert their own row
-- ----------------------------------------------------------------------------
-- Additive: admin's existing unrestricted INSERT is untouched, this only ORs
-- in a second, narrower allowance. The trigger in SECTION 4 is what actually
-- forces status='pending' and created_by=auth.uid() regardless of payload -
-- this policy only gates whether the attempt is allowed to reach the trigger
-- at all.
DROP POLICY IF EXISTS consolidated_insert ON public.categories;
CREATE POLICY consolidated_insert ON public.categories FOR INSERT
WITH CHECK (
    has_role('admin')
    OR (has_permission('categories.propose') AND created_by = auth.uid())
);

-- SECTION 4: force proposal status/ownership - never trust the client
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_category_proposal_ownership()
RETURNS trigger AS $$
BEGIN
    IF has_role('admin') THEN
        -- Admin-authored categories keep today's behavior exactly: whatever
        -- status/created_by the admin sends is respected (defaults to
        -- 'active'/NULL at the application layer, but this trigger does not
        -- second-guess an admin's explicit values).
        RETURN NEW;
    END IF;

    -- Any non-admin insert that reached this point already satisfied the
    -- consolidated_insert WITH CHECK above (categories.propose + own id).
    -- Force the two fields a mentor must never control: they cannot make
    -- their own proposal 'active' by sending that in the payload, and they
    -- cannot attribute the proposal to a different user.
    NEW.status := 'pending';
    NEW.created_by := auth.uid();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.enforce_category_proposal_ownership() IS 'Forces status=pending and created_by=auth.uid() on any non-admin categories INSERT, regardless of client-supplied payload values. Admin inserts are unaffected.';

DROP TRIGGER IF EXISTS enforce_category_proposal_ownership ON public.categories;
CREATE TRIGGER enforce_category_proposal_ownership
    BEFORE INSERT ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_category_proposal_ownership();

-- SECTION 5: notify admins of a new proposal
-- ----------------------------------------------------------------------------
-- Mirrors notify_admins_course_submitted (20260801000001) exactly: a mentor
-- cannot INSERT into notifications directly (RLS there is admin-only), so a
-- narrow SECURITY DEFINER RPC is the established pattern for this, not a
-- broadened notifications RLS policy. Self-validates the caller actually
-- owns the category being reported on.
CREATE OR REPLACE FUNCTION public.notify_admins_category_proposed(p_category_id uuid)
RETURNS void AS $$
DECLARE
    v_category_name text;
    v_mentor_name text;
BEGIN
    SELECT c.name, p.full_name
    INTO v_category_name, v_mentor_name
    FROM public.categories c
    JOIN public.profiles p ON p.id = c.created_by
    WHERE c.id = p_category_id
      AND c.created_by = auth.uid()
      AND c.status = 'pending';

    IF v_category_name IS NULL THEN
        RAISE EXCEPTION 'Category % not found, not pending, or not proposed by the calling user', p_category_id;
    END IF;

    INSERT INTO public.notifications (recipient_id, title, message, type, is_read, metadata)
    SELECT
        ur.user_id,
        'New category awaiting approval',
        format('%s proposed a new category: "%s".', COALESCE(v_mentor_name, 'A mentor'), v_category_name),
        'broadcast',
        false,
        jsonb_build_object('category', 'category_proposal', 'action_url', '/admin/courses/categories?status=pending')
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.code = 'admin' AND ur.revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.notify_admins_category_proposed(uuid) IS 'Notifies all admins that the calling mentor proposed a new category. Bypasses the admin-only notifications INSERT policy via SECURITY DEFINER; verifies proposal ownership itself.';

GRANT EXECUTE ON FUNCTION public.notify_admins_category_proposed(uuid) TO authenticated;
