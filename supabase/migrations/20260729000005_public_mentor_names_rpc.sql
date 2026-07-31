-- Critical bug found during Enterprise Mentor Management Phase 3's public-page
-- audit: `profiles` RLS only allows `auth.uid() = id OR has_role('admin')` —
-- there has never been a public SELECT policy. Every public-facing mentor
-- query (mentor.repository.ts's findBySlug/findRelated) joins `profiles` for
-- `full_name` directly, which means the "real, DB-backed" mentor profile page
-- (Phase 1.19) has been returning "Mentor Not Found" for every real anonymous
-- visitor and every non-admin authenticated user since it was built — the
-- exact audience the public page exists for. Verification since then happened
-- in an admin session, which masked this.
--
-- Fix: a narrow, safe SECURITY DEFINER RPC that exposes only the specific
-- public-safe fields (name, city, country) needed for the mentor catalog/
-- profile pages, and only for rows that are genuinely active mentors — not a
-- blanket profiles RLS widening, which would leak email/phone/DOB/address to
-- anonymous visitors.

CREATE OR REPLACE FUNCTION public.get_public_mentor_profiles(p_mentor_ids uuid[])
RETURNS TABLE (id uuid, full_name text, city text, country text) AS $$
    SELECT p.id, p.full_name, p.city, p.country
    FROM public.profiles p
    JOIN public.mentor_profiles mp ON mp.id = p.id
    WHERE p.id = ANY(p_mentor_ids)
      AND mp.deleted_at IS NULL
      AND mp.status = 'active';
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_public_mentor_profiles(uuid[]) TO anon, authenticated;
