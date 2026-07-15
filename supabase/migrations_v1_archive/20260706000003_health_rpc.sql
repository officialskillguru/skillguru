-- ==============================================================================
-- ENTERPRISE DATABASE VERIFICATION RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.verify_auth_setup()
RETURNS json AS $$
DECLARE
    _trigger_exists boolean;
    _function_exists boolean;
    _fk_exists boolean;
    _missing_profiles int;
    _duplicate_uuids int;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created' 
        AND tgrelid = 'auth.users'::regclass
    ) INTO _trigger_exists;

    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') INTO _function_exists;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'profiles' AND kcu.column_name = 'id'
    ) INTO _fk_exists;

    SELECT count(*) INTO _missing_profiles FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles);
    
    SELECT count(*) INTO _duplicate_uuids FROM (
        SELECT id FROM public.profiles GROUP BY id HAVING count(*) > 1
    ) dupes;

    RETURN json_build_object(
        'trigger_exists', _trigger_exists,
        'function_exists', _function_exists,
        'foreign_key_exists', _fk_exists,
        'has_orphaned_users', _missing_profiles > 0,
        'has_duplicate_uuids', _duplicate_uuids > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
