-- Real bug found in the final Mentor Module production audit: mentor.repository.ts
-- hardcoded `avatar: ""` for every mentor across the catalog, profile, and
-- related-mentors views, even though profiles.avatar_file_id exists and
-- resolveFileUrl() is already used elsewhere in the same file for project/
-- certification images. get_public_mentor_profiles() (20260729000005) didn't
-- expose it. Extending it — avatar_file_id is public-safe (same class as
-- full_name), not sensitive like email/phone/DOB.
--
-- Return type changed (new output column), so the function must be dropped
-- and recreated rather than CREATE OR REPLACE'd.

DROP FUNCTION IF EXISTS public.get_public_mentor_profiles(uuid[]);

CREATE FUNCTION public.get_public_mentor_profiles(p_mentor_ids uuid[])
RETURNS TABLE (id uuid, full_name text, city text, country text, avatar_file_id uuid) AS $$
    SELECT p.id, p.full_name, p.city, p.country, p.avatar_file_id
    FROM public.profiles p
    JOIN public.mentor_profiles mp ON mp.id = p.id
    WHERE p.id = ANY(p_mentor_ids)
      AND mp.deleted_at IS NULL
      AND mp.status = 'active';
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_public_mentor_profiles(uuid[]) TO anon, authenticated;
