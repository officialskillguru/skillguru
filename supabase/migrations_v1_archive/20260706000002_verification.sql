-- ==============================================================================
-- ENTERPRISE DATABASE VERIFICATION SCRIPT
-- ==============================================================================
-- Run this in your Supabase SQL Editor.
-- It will RAISE EXCEPTION if any enterprise rule is violated.
-- Deployment should FAIL if this script fails.

DO $$
DECLARE
    _trigger_exists boolean;
    _trigger_enabled varchar;
    _function_exists boolean;
    _function_security varchar;
    _function_search_path varchar;
    _fk_exists boolean;
    _fk_cascade boolean;
    _duplicate_uuids int;
    _missing_profiles int;
    _orphaned_auth_users int;
    _duplicate_emails int;
BEGIN
    -- 1. Check Trigger Exists and is attached to auth.users
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created' 
        AND tgrelid = 'auth.users'::regclass
    ) INTO _trigger_exists;
    IF NOT _trigger_exists THEN
        RAISE EXCEPTION 'Trigger on_auth_user_created does not exist or is not attached to auth.users.';
    END IF;

    -- 2. Check Trigger Enabled
    SELECT tgenabled INTO _trigger_enabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
    IF _trigger_enabled = 'D' THEN
        RAISE EXCEPTION 'Trigger on_auth_user_created is disabled (tgenabled = %)', _trigger_enabled;
    END IF;

    -- 3. Check Function Exists & Security
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') INTO _function_exists;
    IF NOT _function_exists THEN
        RAISE EXCEPTION 'Function handle_new_user does not exist.';
    END IF;

    SELECT prosecdef INTO _function_security FROM pg_proc WHERE proname = 'handle_new_user';
    IF _function_security IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Function handle_new_user MUST be SECURITY DEFINER.';
    END IF;

    -- 4. Check Search Path
    SELECT proconfig INTO _function_search_path FROM pg_proc WHERE proname = 'handle_new_user';
    IF _function_search_path IS NULL OR array_to_string(_function_search_path, ',') NOT LIKE '%search_path=public%' THEN
        RAISE EXCEPTION 'Function handle_new_user MUST have search_path set to public to prevent hijacking.';
    END IF;

    -- 5. Check Foreign Key and Cascade
    SELECT EXISTS(
        SELECT 1 FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
        WHERE kcu.table_name = 'profiles' AND kcu.column_name = 'id'
    ) INTO _fk_exists;
    IF NOT _fk_exists THEN
        RAISE EXCEPTION 'Foreign key from profiles.id to auth.users.id is missing.';
    END IF;

    SELECT delete_rule INTO _fk_cascade FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'profiles' AND kcu.column_name = 'id';
    IF _fk_cascade != 'CASCADE' THEN
        RAISE EXCEPTION 'Foreign key from profiles.id to auth.users.id MUST have ON DELETE CASCADE.';
    END IF;

    -- 6. Check Duplicate UUIDs in profiles
    SELECT count(*) INTO _duplicate_uuids FROM (
        SELECT id FROM public.profiles GROUP BY id HAVING count(*) > 1
    ) dupes;
    IF _duplicate_uuids > 0 THEN
        RAISE EXCEPTION 'Found % duplicate UUIDs in profiles table.', _duplicate_uuids;
    END IF;

    -- 7. Check Duplicate Emails in profiles
    SELECT count(*) INTO _duplicate_emails FROM (
        SELECT email FROM public.profiles GROUP BY email HAVING count(*) > 1
    ) dupes;
    IF _duplicate_emails > 0 THEN
        RAISE EXCEPTION 'Found % duplicate emails in profiles table.', _duplicate_emails;
    END IF;

    -- 8. Check Missing Profiles (Orphaned Auth Users)
    SELECT count(*) INTO _missing_profiles FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles);
    IF _missing_profiles > 0 THEN
        RAISE EXCEPTION 'Found % orphaned auth.users missing public.profiles. Run reconciliation script.', _missing_profiles;
    END IF;

    -- 9. Check RLS is Enabled
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles' AND relrowsecurity = true) THEN
        RAISE EXCEPTION 'Row Level Security (RLS) is NOT enabled on public.profiles.';
    END IF;

    RAISE NOTICE 'SUCCESS: Enterprise database verification passed. All checks green.';
END;
$$;
