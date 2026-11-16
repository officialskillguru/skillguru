-- Fix: calculate_profile_completion() referenced profiles.avatar_url, a column
-- that no migration ever creates (the real column is avatar_file_id, see
-- 003_identity.sql). PL/pgSQL only resolves record fields at run time, so the
-- function was created fine but raised `record "p" has no field "avatar_url"`
-- on the first profile INSERT. Because trg_profile_completion fires inside
-- handle_new_user(), that made every auth user creation fail ("Database error
-- creating new user") on any project built purely from migrations.
--
-- The original project only worked because its copy of this function had been
-- patched outside of migrations. Same scoring weights; only the column changes.

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(profile_id uuid)
RETURNS int AS $$
DECLARE
    score int := 0;
    p public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO p FROM public.profiles WHERE id = profile_id;
    IF p.full_name IS NOT NULL AND p.full_name <> '' THEN score := score + 10; END IF;
    IF p.email IS NOT NULL THEN score := score + 10; END IF;
    IF p.phone IS NOT NULL THEN score := score + 10; END IF;
    IF p.avatar_file_id IS NOT NULL THEN score := score + 15; END IF;
    IF p.bio IS NOT NULL AND p.bio <> '' THEN score := score + 10; END IF;
    IF p.country IS NOT NULL THEN score := score + 5; END IF;
    IF p.city IS NOT NULL THEN score := score + 5; END IF;
    IF p.date_of_birth IS NOT NULL THEN score := score + 5; END IF;
    IF p.linkedin_url IS NOT NULL THEN score := score + 5; END IF;
    IF p.github_url IS NOT NULL THEN score := score + 5; END IF;
    IF p.portfolio_url IS NOT NULL THEN score := score + 5; END IF;
    IF p.username IS NOT NULL THEN score := score + 5; END IF;
    IF p.gender IS NOT NULL THEN score := score + 5; END IF;
    IF p.address IS NOT NULL THEN score := score + 5; END IF;
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
