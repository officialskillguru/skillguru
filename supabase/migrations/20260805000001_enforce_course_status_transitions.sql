-- ============================================================================
-- Enforce course.status transitions at the database level.
-- ============================================================================
-- WHY: courses RLS only ever checked "does this principal own the row / hold
--      courses.update_all" - it never validated WHICH status change was being
--      made. RLS on public.courses allows any UPDATE that passes ownership +
--      courses.update_own, including changing `status` to any value. A
--      mentor holding courses.update_own could therefore set their own
--      course's status directly to 'published' via a raw PostgREST/RPC call,
--      completely bypassing the draft -> under_review -> published review
--      workflow the application UI enforces only in React state. The React
--      lock (isMentorLocked in CourseCurriculumEditor.tsx) is real UX but is
--      not a security boundary - it does nothing against a direct API call.
--
-- WHAT: A single BEFORE INSERT OR UPDATE trigger function, the one place
--       that knows which (old_status -> new_status) transitions are legal
--       for which permission tier. Layers on top of the existing RLS
--       policies (does not replace, weaken, or duplicate them) - RLS still
--       decides *whether a row is reachable at all* (ownership / role);
--       this trigger decides *which status transitions are legal* once a
--       row is reachable. Two different questions, one enforcement point
--       each, so there is exactly one place to look for "what status moves
--       are allowed" instead of it being smeared across N RLS policies.
--
-- Allowed transitions:
--   Admin / courses.update_all:   any status -> any status (unchanged - the
--                                  existing "Admins update all courses" /
--                                  consolidated_update policy already grants
--                                  this at the row level; this trigger does
--                                  not narrow it).
--   courses.publish holder:       -> published, from any prior status (lets
--                                  a future narrower "content reviewer" role
--                                  publish without needing full update_all;
--                                  today only admin holds this permission).
--   Owning mentor (courses.update_own, not update_all/publish):
--       draft         -> under_review   (submit for review)
--       under_review  -> draft          (withdraw)
--       draft         -> archived       (archive own draft)
--       under_review  -> archived       (archive own pending submission)
--       published     -> archived       (archive own published course)
--       <no status change>              (ordinary field edits - unaffected)
--   Owning mentor - explicitly rejected regardless of any other permission
--   bit they might hold in the future, because these are the exact bypass
--   this migration exists to close:
--       draft         -> published
--       under_review  -> published
--       archived      -> published
--   Anything else attempted by a non-admin, non-publish-holder principal is
--   rejected with a clear error.
--
-- INSERT is covered too: RLS's "Mentors create own courses" WITH CHECK never
-- constrained the *status* of a newly inserted row, so a mentor could insert
-- a brand-new course with status='published' directly. This trigger requires
-- a mentor-created row to be inserted as 'draft' (the column default) unless
-- the inserter holds courses.publish or courses.update_all.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_course_status_transition()
RETURNS trigger AS $$
DECLARE
    _old_status public.course_status;
    _new_status public.course_status;
BEGIN
    _new_status := NEW.status;

    -- The Postgres service_role already bypasses RLS entirely (BYPASSRLS) -
    -- but RLS bypass does NOT bypass triggers, so without this check any
    -- legitimate service-role backend/admin-tooling operation (edge
    -- functions, seed/admin scripts using SUPABASE_SERVICE_ROLE_KEY) would
    -- be blocked here even though it already has full database authority.
    -- Match the same trust boundary RLS already grants it.
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Admins (or any future role holding courses.update_all) keep full,
    -- unrestricted authority over course status - matches "Admin retains
    -- full authorized course-management capability".
    IF public.has_permission('courses.update_all') THEN
        RETURN NEW;
    END IF;

    -- A principal holding courses.publish specifically may move a course to
    -- 'published' from anywhere (today this is a strict subset of admin,
    -- since only the admin role is granted courses.publish - kept separate
    -- from update_all so a narrower future role could be granted publish
    -- authority without also getting full course-management rights).
    IF _new_status = 'published' AND public.has_permission('courses.publish') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Non-admin, non-publish-holder inserts must land as 'draft'. RLS's
        -- "Mentors create own courses" policy already restricts mentor_id to
        -- auth.uid(); this only adds the status constraint that policy never
        -- expressed.
        IF _new_status IS DISTINCT FROM 'draft' THEN
            RAISE EXCEPTION 'Only an admin (or a permission holder authorized to publish) may create a course with status ''%''. New courses must start as draft.', _new_status
                USING ERRCODE = '42501'; -- insufficient_privilege
        END IF;
        RETURN NEW;
    END IF;

    -- TG_OP = 'UPDATE' from here on.
    _old_status := OLD.status;

    IF _new_status IS NOT DISTINCT FROM _old_status THEN
        -- Not a status change - ordinary field edits stay governed purely by
        -- the existing "Mentors update own courses" / consolidated_update
        -- RLS policy (ownership + courses.update_own). Nothing extra to
        -- enforce here.
        RETURN NEW;
    END IF;

    IF (_old_status, _new_status) IN (
        ('draft', 'under_review'),
        ('under_review', 'draft'),
        ('draft', 'archived'),
        ('under_review', 'archived'),
        ('published', 'archived')
    ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Course status cannot be changed from ''%'' to ''%'' by this user. This transition requires admin (or publish) authority.', _old_status, _new_status
        USING ERRCODE = '42501'; -- insufficient_privilege
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.enforce_course_status_transition() IS
    'Single source of truth for which courses.status transitions each permission tier may perform. Layers on top of (does not replace) the ownership/role RLS policies on public.courses. Runs as SECURITY INVOKER so has_permission()/auth.uid() resolve to the calling user, not the table owner.';

DROP TRIGGER IF EXISTS enforce_course_status_transition ON public.courses;
CREATE TRIGGER enforce_course_status_transition
    BEFORE INSERT OR UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_course_status_transition();
