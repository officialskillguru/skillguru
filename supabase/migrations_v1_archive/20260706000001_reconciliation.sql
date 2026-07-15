-- ==============================================================================
-- ENTERPRISE RECONCILIATION SCRIPT
-- ==============================================================================
-- This script fixes orphaned auth.users by safely inserting them into profiles
-- It is 100% idempotent and can be run repeatedly.

DO $$
DECLARE
    _missing_count int;
BEGIN
    -- 1. Identify and insert missing profiles
    WITH inserted AS (
        INSERT INTO public.profiles (id, email, full_name, phone, profile_image, role, status)
        SELECT 
            id, 
            email, 
            COALESCE(raw_user_meta_data->>'full_name', ''),
            COALESCE(raw_user_meta_data->>'phone', NULL),
            COALESCE(raw_user_meta_data->>'profile_image', NULL),
            COALESCE(raw_user_meta_data->>'role', 'student'),
            'active'
        FROM auth.users
        WHERE id NOT IN (SELECT id FROM public.profiles)
        ON CONFLICT (id) DO NOTHING
        RETURNING id
    )
    SELECT count(*) INTO _missing_count FROM inserted;

    -- 2. Log result (will appear in pg_stat_activity / logs)
    RAISE NOTICE 'Reconciliation complete. Inserted % missing profiles.', _missing_count;
END;
$$;
