-- ============================================================================
-- Regression test script for enforce_course_status_transition + courses RLS.
--
-- *** LOCAL / TEST DATABASE ONLY - NEVER RUN AGAINST PRODUCTION. ***
-- This script inserts throwaway auth.users/profiles/courses rows, grants
-- broad local-only table privileges, and patches has_permission() + seeds
-- permission rows to work around known local/production schema drift (see
-- comments below). None of that is safe or appropriate to run against a
-- real project, even though the whole thing runs inside BEGIN...ROLLBACK.
--
-- Usage: `supabase start` (or `supabase start --ignore-health-check` on
-- Windows if the analytics container fails its health check), then:
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     < supabase/tests/course_status_rls.test.sql
--
-- Uses request.jwt.claims + SET ROLE to impersonate anon/authenticated/
-- service_role principals the same way PostgREST/GoTrue does, so this
-- exercises the exact same RLS/trigger path a real API request would hit.
-- ============================================================================
\pset pager off

BEGIN;

-- ─── Local-only test-environment patch (NOT a migration, not committed) ──
-- The locally-migrated schema has has_permission() from 004_rbac.sql, which
-- references permissions.code - a column that no longer exists after
-- 20260718000007_permissions_and_roles.sql dropped/recreated `permissions`
-- with a `slug` column instead, and never updated has_permission() to
-- match. Production's live has_permission() (confirmed via pg_get_functiondef
-- against the real project) already correctly uses p.slug. Patching the
-- local copy to match production exactly, and seeding the courses.*
-- permission rows this task needs (also missing locally - the drop/recreate
-- wiped 004_rbac.sql's seed data and no later local migration re-seeds
-- courses.* permissions, though production clearly has them). This is
-- pre-existing drift unrelated to this task's actual change; noted
-- separately in the report, not "fixed" here as part of the security
-- migration itself.
CREATE OR REPLACE FUNCTION public.has_permission(_permission_code text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()
          AND p.slug = _permission_code
          AND ur.revoked_at IS NULL
          AND p.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

INSERT INTO public.permissions (slug, name, module, description) VALUES
  ('courses.create', 'Create Course', 'courses', 'Create new courses'),
  ('courses.view', 'View Courses', 'courses', 'View published and own draft courses'),
  ('courses.update_own', 'Update Own Courses', 'courses', 'Update own courses'),
  ('courses.update_all', 'Update All Courses', 'courses', 'Update any course (admin)'),
  ('courses.publish', 'Publish Course', 'courses', 'Change course status to published (admin)')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _admin_role uuid; _perm uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role FROM public.roles WHERE code = 'admin';

  FOR _perm IN SELECT id FROM public.permissions WHERE slug IN ('courses.create', 'courses.view', 'courses.update_own') LOOP
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES (_mentor_role, _perm) ON CONFLICT DO NOTHING;
  END LOOP;

  FOR _perm IN SELECT id FROM public.permissions LOOP
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES (_admin_role, _perm) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Local-only schema drift workaround: handle_new_user() references
-- profiles.avatar_url, which exists on production but isn't captured in any
-- local migration file (same drift pattern as the consolidated_select/
-- consolidated_update policies and mentors-bucket policy noted elsewhere).
-- We insert profiles ourselves below, so the trigger's side effect isn't
-- needed for this test - just disable ALL triggers session-wide for fixture
-- setup only (session_replication_role, not an ALTER TABLE, so it needs no
-- ownership of auth.users).
SET session_replication_role = replica;

-- ─── Fixtures ────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'mentor-a@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'mentor-b@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'admin-a@test.local',  crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'student-a@test.local',crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Mentor A', 'mentor-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'Mentor B', 'mentor-b@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'Admin A', 'admin-a@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'Student A', 'student-a@test.local')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _admin_role uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role FROM public.roles WHERE code = 'admin';

  INSERT INTO public.user_roles (user_id, role_id) VALUES
    ('11111111-1111-1111-1111-111111111111', _mentor_role),
    ('22222222-2222-2222-2222-222222222222', _mentor_role),
    ('33333333-3333-3333-3333-333333333333', _admin_role)
  ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;
END $$;

-- courses.mentor_id has a FK to mentor_profiles, not just profiles.
INSERT INTO public.mentor_profiles (id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Local CLI `supabase start` seeding doesn't replicate the platform-level
-- anon/authenticated/service_role table GRANTs a real hosted Supabase
-- project gets automatically (that bootstrap isn't expressed in any
-- migration file - it's provisioned outside of migrations on the real
-- platform). Grant what RLS then further restricts, same as production.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated, anon;
GRANT SELECT ON public.course_categories, public.categories, public.profiles, public.mentor_profiles TO authenticated, anon;

-- Re-enable triggers for the rest of the script - fixture setup is done and
-- we WANT enforce_course_status_transition (and everything else) firing
-- normally for the actual RLS/trigger regression checks below.
SET session_replication_role = origin;

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_user_id uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.as_anon() RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
  SET LOCAL ROLE anon;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.as_service_role() RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  RESET ROLE;
END;
$$ LANGUAGE plpgsql;

\echo '--- Fixture: Mentor A creates a draft course (service role, setup only) ---'
SELECT pg_temp.as_service_role();
INSERT INTO public.courses (id, mentor_id, title, slug, description, status, price)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Test Course A', 'test-course-a-rls-check', 'desc', 'draft', 100)
ON CONFLICT (id) DO UPDATE SET status = 'draft', description = 'desc';

\echo ''
\echo '=== TEST 1: mentor edits own draft course field (expect SUCCESS) ==='
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
UPDATE public.courses SET description = 'updated desc' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT CASE WHEN description = 'updated desc' THEN 'PASS' ELSE 'FAIL' END AS test_1 FROM public.courses WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '=== TEST 2: mentor B edits mentor A course (expect 0 rows updated) ==='
SELECT pg_temp.as_user('22222222-2222-2222-2222-222222222222');
WITH upd AS (
  UPDATE public.courses SET description = 'hijacked' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING 1
)
SELECT CASE WHEN count(*) = 0 THEN 'PASS (0 rows updated)' ELSE 'FAIL (' || count(*) || ' rows updated)' END AS test_2 FROM upd;

\echo ''
\echo '=== TEST 3: mentor draft -> under_review (expect SUCCESS) ==='
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
UPDATE public.courses SET status = 'under_review' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT CASE WHEN status = 'under_review' THEN 'PASS' ELSE 'FAIL' END AS test_3 FROM public.courses WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '=== TEST 4: mentor under_review -> published DIRECT (expect ERROR, status unchanged) ==='
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
DO $$
BEGIN
  UPDATE public.courses SET status = 'published' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE NOTICE 'test_4: FAIL (update succeeded, should have been rejected)';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'test_4: PASS (rejected: %)', SQLERRM;
END $$;
SELECT CASE WHEN status = 'under_review' THEN 'PASS (status still under_review)' ELSE 'FAIL (status=' || status || ')' END AS test_4_status FROM public.courses WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '=== TEST 5: mentor withdraw under_review -> draft (expect SUCCESS) ==='
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
UPDATE public.courses SET status = 'draft' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT CASE WHEN status = 'draft' THEN 'PASS' ELSE 'FAIL' END AS test_5 FROM public.courses WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '=== TEST 5b: mentor draft -> published DIRECT (expect ERROR, status unchanged) ==='
DO $$
BEGIN
  UPDATE public.courses SET status = 'published' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE NOTICE 'test_5b: FAIL (draft -> published succeeded for mentor!)';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'test_5b: PASS (rejected: %)', SQLERRM;
END $$;
SELECT CASE WHEN status = 'draft' THEN 'PASS (status still draft)' ELSE 'FAIL (status=' || status || ')' END AS test_5b_status FROM public.courses WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '=== TEST 6: anonymous UPDATE attempt (expect denial/0 rows) ==='
SELECT pg_temp.as_anon();
DO $$
DECLARE _n int;
BEGIN
  WITH upd AS (
    UPDATE public.courses SET status = 'published' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING 1
  )
  SELECT count(*) INTO _n FROM upd;
  IF _n = 0 THEN
    RAISE NOTICE 'test_6: PASS (0 rows updated for anon)';
  ELSE
    RAISE NOTICE 'test_6: FAIL (% rows updated for anon!)', _n;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'test_6: PASS (errored as expected: %)', SQLERRM;
END $$;

\echo ''
\echo '=== TEST 7: mentor submits (draft->under_review) then admin approves (under_review->published) ==='
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
UPDATE public.courses SET status = 'under_review' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT pg_temp.as_user('33333333-3333-3333-3333-333333333333');
UPDATE public.courses SET status = 'published' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT CASE WHEN status = 'published' THEN 'PASS' ELSE 'FAIL' END AS test_7 FROM public.courses WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '=== TEST 8: admin rejection (under_review -> draft) ==='
SELECT pg_temp.as_service_role();
UPDATE public.courses SET status = 'under_review' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT pg_temp.as_user('33333333-3333-3333-3333-333333333333');
UPDATE public.courses SET status = 'draft' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT CASE WHEN status = 'draft' THEN 'PASS' ELSE 'FAIL' END AS test_8 FROM public.courses WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '=== TEST 9: mentor INSERTs a new course directly as published (expect ERROR) ==='
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
DO $$
BEGIN
  INSERT INTO public.courses (mentor_id, title, slug, description, status, price)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Sneaky Course', 'sneaky-course-rls-check', 'desc', 'published', 50);
  RAISE NOTICE 'test_9: FAIL (mentor inserted a published course directly!)';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'test_9: PASS (rejected: %)', SQLERRM;
END $$;
SELECT CASE WHEN count(*) = 0 THEN 'PASS (no such row exists)' ELSE 'FAIL' END AS test_9_no_row FROM public.courses WHERE slug = 'sneaky-course-rls-check';

\echo ''
\echo '=== TEST 10: public discovery only exposes published, non-deleted courses ==='
SELECT pg_temp.as_service_role();
INSERT INTO public.courses (id, mentor_id, title, slug, description, status, price, deleted_at)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Draft Course', 'draft-course-rls-check', 'd', 'draft', 10, NULL),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Deleted Published Course', 'deleted-published-rls-check', 'd', 'published', 10, now())
ON CONFLICT (id) DO NOTHING;

SELECT pg_temp.as_anon();
SELECT
  CASE WHEN (SELECT count(*) FROM public.courses WHERE slug = 'draft-course-rls-check') = 0 THEN 'PASS' ELSE 'FAIL' END AS test_10a_draft_hidden,
  CASE WHEN (SELECT count(*) FROM public.courses WHERE slug = 'deleted-published-rls-check') = 0 THEN 'PASS' ELSE 'FAIL' END AS test_10b_soft_deleted_hidden,
  CASE WHEN (SELECT count(*) FROM public.courses WHERE slug = 'test-course-a-rls-check') = 0 THEN 'PASS (draft, correctly hidden)' ELSE 'unexpected' END AS test_10c_course_a_current_state;

ROLLBACK;
\echo ''
\echo 'All fixtures rolled back - no changes persisted.'
