-- ==============================================================================
-- ENTERPRISE AUTHENTICATION STRICT REDESIGN
-- ==============================================================================

-- 1. Foreign Key constraints
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Strict Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Idempotent check: DO NOTHING if already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
            phone,
            profile_image,
            role, 
            status
        )
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', ''),
            COALESCE(new.raw_user_meta_data->>'phone', NULL),
            COALESCE(new.raw_user_meta_data->>'profile_image', NULL),
            COALESCE(new.raw_user_meta_data->>'role', 'student'),
            'active'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- If profile creation fails, we RAISE EXCEPTION.
        -- This explicitly fails the transaction, preventing the user from being 
        -- created in auth.users and becoming an orphan. 
        -- The database remains perfectly consistent.
        RAISE EXCEPTION 'Failed to create public.profiles for user %: %', new.id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Recreate Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
