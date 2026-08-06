-- ============================================================================
-- Category taxonomy governance: status workflow + hierarchy safety.
-- ============================================================================
-- WHY: categories had no status concept at all - "active" was implicitly
--      "not soft-deleted". There was no way to hold a category in a
--      pending/rejected state (needed so a future mentor-proposal workflow
--      never silently publishes a taxonomy entry), and no protection against
--      a category becoming its own ancestor or nesting beyond the intended
--      category -> subcategory -> course shape.
--
-- SCOPE: this migration only adds admin-manageable status/hierarchy-safety
--        plumbing. It does NOT add a mentor write path - categories remain
--        has_role('admin')-gated for INSERT/UPDATE/DELETE exactly as today
--        (consolidated_insert/update/delete policies, unchanged). A mentor
--        proposal path is a later phase's scope, not introduced here.
-- ============================================================================

-- SECTION 1: status + icon columns
-- ----------------------------------------------------------------------------
-- Every existing row gets 'active' by default, so today's live public
-- category nav (9 existing top-level categories, already displayed on the
-- site) is completely unaffected - this is a no-op for current data.
ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('pending', 'active', 'rejected', 'archived')),
    ADD COLUMN IF NOT EXISTS icon text;

COMMENT ON COLUMN public.categories.status IS 'pending: awaiting admin approval (not yet publicly discoverable). active: normal, publicly selectable. rejected: admin declined a proposal, never public. archived: previously active, hidden from new selection but course associations preserved.';
COMMENT ON COLUMN public.categories.icon IS 'Optional icon identifier (e.g. a lucide-react icon name) for admin/marketing display. Nullable - no icon is a valid state.';

-- SECTION 2: public read must respect status, not just deleted_at
-- ----------------------------------------------------------------------------
-- Narrowing, not weakening: previously any non-deleted row was publicly
-- readable regardless of status (status didn't exist). Every existing row
-- defaults to 'active' above, so this is a no-op today; it only takes effect
-- for future pending/rejected/archived rows, which is the entire point.
-- Admins still see everything via the has_role('admin') branch, unchanged.
--
-- DEFENSIVE DROP: the live database's actual policy names on this table are
-- "consolidated_select/insert/update/delete" (confirmed by direct
-- inspection), not the "Public read active categories"/"Admin manage
-- categories" names 006_content.sql originally created - those were renamed/
-- consolidated out-of-band at some point and no tracked migration captures
-- that rename. A from-scratch build (e.g. local `supabase db reset`) still
-- has the old names. Dropping every historical name variant here (all
-- IF EXISTS, safe on any environment) and recreating the full consolidated
-- set makes this migration correct whether it runs against the already-
-- consolidated production schema (pure no-op replacement) or a fresh build
-- still on the old names (actually performs the missing consolidation).
DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
DROP POLICY IF EXISTS consolidated_select ON public.categories;
DROP POLICY IF EXISTS consolidated_insert ON public.categories;
DROP POLICY IF EXISTS consolidated_update ON public.categories;
DROP POLICY IF EXISTS consolidated_delete ON public.categories;

CREATE POLICY consolidated_select ON public.categories FOR SELECT
USING (
    has_role('admin')
    OR (deleted_at IS NULL AND status = 'active')
);

CREATE POLICY consolidated_insert ON public.categories FOR INSERT
WITH CHECK (has_role('admin'));

CREATE POLICY consolidated_update ON public.categories FOR UPDATE
USING (has_role('admin'))
WITH CHECK (has_role('admin'));

CREATE POLICY consolidated_delete ON public.categories FOR DELETE
USING (has_role('admin'));

-- SECTION 3: prevent circular references and enforce a 2-level hierarchy
-- ----------------------------------------------------------------------------
-- The requested taxonomy shape is exactly Category -> Subcategory -> Course.
-- Without this guard, parent_id (a plain self-FK) allows arbitrary depth and
-- A->B->A cycles.
CREATE OR REPLACE FUNCTION public.enforce_category_hierarchy()
RETURNS trigger AS $$
DECLARE
    _parent_of_parent uuid;
    _cursor uuid;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'A category cannot be its own parent.' USING ERRCODE = '23514';
    END IF;

    -- Depth limit: the chosen parent must itself be a top-level category
    -- (parent_id IS NULL). This enforces category -> subcategory -> course
    -- as exactly two taxonomy levels, not arbitrary nesting.
    SELECT parent_id INTO _parent_of_parent FROM public.categories WHERE id = NEW.parent_id;
    IF _parent_of_parent IS NOT NULL THEN
        RAISE EXCEPTION 'Categories may only be nested two levels deep (category -> subcategory). The chosen parent is itself a subcategory.' USING ERRCODE = '23514';
    END IF;

    -- Cycle guard (defense in depth beyond the depth limit above, in case the
    -- depth limit is ever relaxed later): walk up from the proposed parent
    -- and confirm NEW.id never appears as an ancestor.
    _cursor := NEW.parent_id;
    WHILE _cursor IS NOT NULL LOOP
        IF _cursor = NEW.id THEN
            RAISE EXCEPTION 'This change would create a circular category reference.' USING ERRCODE = '23514';
        END IF;
        SELECT parent_id INTO _cursor FROM public.categories WHERE id = _cursor;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.enforce_category_hierarchy() IS 'Rejects self-parenting, cycles, and nesting beyond two levels (category -> subcategory) on public.categories.';

DROP TRIGGER IF EXISTS enforce_category_hierarchy ON public.categories;
CREATE TRIGGER enforce_category_hierarchy
    BEFORE INSERT OR UPDATE OF parent_id ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_category_hierarchy();

-- SECTION 4: prevent destructive deletion of a referenced category
-- ----------------------------------------------------------------------------
-- course_categories.category_id currently has ON DELETE CASCADE, meaning a
-- hard DELETE on categories would silently orphan any course's category
-- association with zero warning - the opposite of "prevent destructive
-- deletion when referenced". The admin UI in this phase only ever exposes
-- archive (a status change, fully reversible) rather than hard delete, but
-- the RLS consolidated_delete policy still technically permits DELETE at
-- the database level - this trigger is the real, non-bypassable guarantee,
-- not just a UI omission. Categories with subcategories or any course
-- association must be reparented/reassigned (or simply archived) before
-- they can be hard-deleted.
CREATE OR REPLACE FUNCTION public.prevent_referenced_category_deletion()
RETURNS trigger AS $$
DECLARE
    _child_count int;
    _course_count int;
BEGIN
    SELECT count(*) INTO _child_count FROM public.categories WHERE parent_id = OLD.id;
    IF _child_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete category "%": it has % subcategor(y/ies). Reassign or delete them first, or archive this category instead.', OLD.name, _child_count
            USING ERRCODE = '23503';
    END IF;

    SELECT count(*) INTO _course_count FROM public.course_categories WHERE category_id = OLD.id;
    IF _course_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete category "%": % course(s) reference it. Reassign those courses to a different category first, or archive this category instead.', OLD.name, _course_count
            USING ERRCODE = '23503';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.prevent_referenced_category_deletion() IS 'Blocks hard DELETE on public.categories when the row has subcategories or course associations - archiving (status change) is the intended path for a category still in use.';

DROP TRIGGER IF EXISTS prevent_referenced_category_deletion ON public.categories;
CREATE TRIGGER prevent_referenced_category_deletion
    BEFORE DELETE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_referenced_category_deletion();

-- SECTION 5: indexes for the query patterns the new admin UI and existing
-- public discovery need (parent lookups, status filtering, course-count).
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_status ON public.categories(status);
CREATE INDEX IF NOT EXISTS idx_course_categories_category_id ON public.course_categories(category_id);
