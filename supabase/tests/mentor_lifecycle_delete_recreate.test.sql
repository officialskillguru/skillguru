-- ============================================================================
-- Regression test for 20260901000001_mentor_lifecycle_delete_recreate_fix.sql
-- (the "delete mentor -> recreate with same email -> 409" production bug fix).
--
-- Covers:
--   TEST 1: admin_soft_delete_mentor() sets deleted_at + login_disabled and
--           revokes refresh tokens/active sessions.
--   TEST 2: admin_restore_mentor() clears deleted_at and re-enables login
--           because THIS delete is what disabled it.
--   TEST 3: a manual admin lock survives a delete+restore cycle (restore only
--           clears login_disabled when login_disabled_by_deletion is true).
--   TEST 4: a non-admin cannot call either RPC.
--   TEST 5: assert_login_allowed() raises for a deleted/locked mentor and is
--           a no-op for an active mentor and for a non-mentor account.
--
-- *** LOCAL / TEST DATABASE ONLY - NEVER RUN AGAINST PRODUCTION. ***
--
-- Usage: `supabase start --ignore-health-check` (Windows), then:
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     < supabase/tests/mentor_lifecycle_delete_recreate.test.sql
-- ============================================================================
\pset pager off
BEGIN;

SET session_replication_role = replica;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('f0000000-0000-0000-0000-00000000000a', 'admin-lc@test.local',   crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-00000000000b', 'mentor-lc-1@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-00000000000c', 'mentor-lc-2@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-00000000000d', 'student-lc@test.local',  crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email) VALUES
  ('f0000000-0000-0000-0000-00000000000a', 'Admin LC',    'admin-lc@test.local'),
  ('f0000000-0000-0000-0000-00000000000b', 'Mentor LC 1', 'mentor-lc-1@test.local'),
  ('f0000000-0000-0000-0000-00000000000c', 'Mentor LC 2', 'mentor-lc-2@test.local'),
  ('f0000000-0000-0000-0000-00000000000d', 'Student LC',  'student-lc@test.local')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _admin_role uuid; _student_role uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role FROM public.roles WHERE code = 'admin';
  SELECT id INTO _student_role FROM public.roles WHERE code = 'student';
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    ('f0000000-0000-0000-0000-00000000000a', _admin_role),
    ('f0000000-0000-0000-0000-00000000000b', _mentor_role),
    ('f0000000-0000-0000-0000-00000000000c', _mentor_role),
    ('f0000000-0000-0000-0000-00000000000d', _student_role)
  ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;
END $$;

INSERT INTO public.mentor_profiles (id) VALUES
  ('f0000000-0000-0000-0000-00000000000b'),
  ('f0000000-0000-0000-0000-00000000000c')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.refresh_tokens (instance_id, token, user_id, revoked, session_id)
VALUES ('00000000-0000-0000-0000-000000000000', 'rt-mentor-lc-1', 'f0000000-0000-0000-0000-00000000000b', false, gen_random_uuid())
ON CONFLICT DO NOTHING;

SET session_replication_role = origin;

-- ----------------------------------------------------------------------------
-- TEST 1 + 2: soft delete then restore, as admin
-- ----------------------------------------------------------------------------
SET LOCAL request.jwt.claims = '{"sub":"f0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
SET LOCAL role = authenticated;

SELECT public.admin_soft_delete_mentor('f0000000-0000-0000-0000-00000000000b');

DO $$
DECLARE r record;
BEGIN
  SELECT deleted_at, login_disabled, login_disabled_by_deletion INTO r
  FROM public.mentor_profiles WHERE id = 'f0000000-0000-0000-0000-00000000000b';
  ASSERT r.deleted_at IS NOT NULL, 'TEST 1 FAILED: deleted_at should be set';
  ASSERT r.login_disabled = true, 'TEST 1 FAILED: login_disabled should be true';
  ASSERT r.login_disabled_by_deletion = true, 'TEST 1 FAILED: login_disabled_by_deletion should be true';
  RAISE NOTICE 'TEST 1 PASSED: soft delete sets deleted_at + login_disabled';
END $$;

DO $$
BEGIN
  ASSERT NOT EXISTS (
    SELECT 1 FROM auth.refresh_tokens WHERE user_id = 'f0000000-0000-0000-0000-00000000000b'
  ), 'TEST 1 FAILED: refresh tokens should be revoked on delete';
  RAISE NOTICE 'TEST 1 PASSED: refresh tokens revoked on delete';
END $$;

SELECT public.admin_restore_mentor('f0000000-0000-0000-0000-00000000000b');

DO $$
DECLARE r record;
BEGIN
  SELECT deleted_at, login_disabled, login_disabled_by_deletion INTO r
  FROM public.mentor_profiles WHERE id = 'f0000000-0000-0000-0000-00000000000b';
  ASSERT r.deleted_at IS NULL, 'TEST 2 FAILED: deleted_at should be cleared';
  ASSERT r.login_disabled = false, 'TEST 2 FAILED: login_disabled should be re-enabled (delete owned the lock)';
  ASSERT r.login_disabled_by_deletion = false, 'TEST 2 FAILED: login_disabled_by_deletion should be cleared';
  RAISE NOTICE 'TEST 2 PASSED: restore clears deleted_at and re-enables login';
END $$;

-- ----------------------------------------------------------------------------
-- TEST 3: a manual admin lock survives a delete+restore cycle
-- ----------------------------------------------------------------------------
UPDATE public.mentor_profiles
SET login_disabled = true, locked_reason = 'manual lock before delete'
WHERE id = 'f0000000-0000-0000-0000-00000000000c';

SELECT public.admin_soft_delete_mentor('f0000000-0000-0000-0000-00000000000c');

DO $$
DECLARE r record;
BEGIN
  SELECT login_disabled_by_deletion INTO r FROM public.mentor_profiles WHERE id = 'f0000000-0000-0000-0000-00000000000c';
  ASSERT r.login_disabled_by_deletion = false, 'TEST 3 FAILED: delete should not claim ownership of a pre-existing manual lock';
  RAISE NOTICE 'TEST 3 PASSED: delete does not claim a pre-existing manual lock';
END $$;

SELECT public.admin_restore_mentor('f0000000-0000-0000-0000-00000000000c');

DO $$
DECLARE r record;
BEGIN
  SELECT login_disabled, locked_reason INTO r FROM public.mentor_profiles WHERE id = 'f0000000-0000-0000-0000-00000000000c';
  ASSERT r.login_disabled = true, 'TEST 3 FAILED: restore should NOT clear a manual lock it did not create';
  ASSERT r.locked_reason = 'manual lock before delete', 'TEST 3 FAILED: manual lock reason should survive restore';
  RAISE NOTICE 'TEST 3 PASSED: manual lock survives delete+restore';
END $$;

RESET role;
RESET request.jwt.claims;

-- ----------------------------------------------------------------------------
-- TEST 4: non-admin cannot call either RPC
-- ----------------------------------------------------------------------------
SET LOCAL request.jwt.claims = '{"sub":"f0000000-0000-0000-0000-00000000000d","role":"authenticated"}';
SET LOCAL role = authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.admin_soft_delete_mentor('f0000000-0000-0000-0000-00000000000b');
    RAISE EXCEPTION 'TEST 4 FAILED: non-admin should not be able to soft-delete a mentor';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST 4 PASSED: non-admin blocked from admin_soft_delete_mentor';
  END;

  BEGIN
    PERFORM public.admin_restore_mentor('f0000000-0000-0000-0000-00000000000c');
    RAISE EXCEPTION 'TEST 4 FAILED: non-admin should not be able to restore a mentor';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST 4 PASSED: non-admin blocked from admin_restore_mentor';
  END;
END $$;

RESET role;
RESET request.jwt.claims;

-- ----------------------------------------------------------------------------
-- TEST 5: assert_login_allowed()
-- ----------------------------------------------------------------------------
-- mentor 2 is still locked (from TEST 3) - assert should raise
SET LOCAL request.jwt.claims = '{"sub":"f0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
SET LOCAL role = authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.assert_login_allowed();
    RAISE EXCEPTION 'TEST 5 FAILED: locked mentor should be blocked from login';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST 5 PASSED: assert_login_allowed blocks a locked mentor';
  END;
END $$;
RESET role;
RESET request.jwt.claims;

-- mentor 1 is active (restored in TEST 2) - assert should be a silent no-op
SET LOCAL request.jwt.claims = '{"sub":"f0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
SET LOCAL role = authenticated;
SELECT public.assert_login_allowed();
DO $$ BEGIN RAISE NOTICE 'TEST 5 PASSED: assert_login_allowed is a no-op for an active mentor'; END $$;
RESET role;
RESET request.jwt.claims;

-- student has no mentor_profiles row - assert should be a silent no-op
SET LOCAL request.jwt.claims = '{"sub":"f0000000-0000-0000-0000-00000000000d","role":"authenticated"}';
SET LOCAL role = authenticated;
SELECT public.assert_login_allowed();
DO $$ BEGIN RAISE NOTICE 'TEST 5 PASSED: assert_login_allowed is a no-op for a non-mentor account'; END $$;
RESET role;
RESET request.jwt.claims;

ROLLBACK;
