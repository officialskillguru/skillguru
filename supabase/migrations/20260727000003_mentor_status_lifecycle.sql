-- Real mentor account lifecycle (BUG-06): mentors.service.ts's setMentorStatus()
-- previously overwrote a mentor's bio field as a hacky no-op instead of changing
-- any real status, and there was no soft-delete/restore capability at all.
-- Additive, backward-compatible: existing rows get status='active', deleted_at
-- NULL, identical to today's implicit behavior.

ALTER TABLE public.mentor_profiles
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_status ON public.mentor_profiles(status);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_deleted_at ON public.mentor_profiles(deleted_at);

-- Tighten the existing consolidated SELECT policy so a soft-deleted mentor is
-- no longer publicly visible (admins keep full visibility via has_role bypass).
-- Previous qual was "(has_role('admin') OR true)" - i.e. always true. Every
-- existing row has deleted_at IS NULL today, so this is a no-op for current
-- data and only takes effect once a mentor is actually soft-deleted.
DROP POLICY IF EXISTS consolidated_select ON public.mentor_profiles;
CREATE POLICY consolidated_select ON public.mentor_profiles
    FOR SELECT USING (public.has_role('admin') OR deleted_at IS NULL);
