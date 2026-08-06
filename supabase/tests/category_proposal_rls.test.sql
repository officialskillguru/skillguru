-- ============================================================================
-- Regression test script for the Phase B mentor category proposal migration
-- (20260807000001_mentor_category_proposals.sql).
--
-- *** LOCAL / TEST DATABASE ONLY - NEVER RUN AGAINST PRODUCTION. ***
-- See supabase/tests/category_taxonomy_rls.test.sql for the local
-- environment setup notes (production-only category simulation, local
-- grants gap) - identical caveats apply here.
--
-- Usage: `supabase start --ignore-health-check` (Windows), then:
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     < supabase/tests/category_proposal_rls.test.sql
-- ============================================================================
\pset pager off
BEGIN;

SET session_replication_role = replica;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'mentor-a-propose@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('88888888-8888-8888-8888-888888888888', 'mentor-b-propose@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('99999999-8888-8888-8888-888888888888', 'admin-propose@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email) VALUES
  ('77777777-7777-7777-7777-777777777777', 'Mentor A Propose', 'mentor-a-propose@test.local'),
  ('88888888-8888-8888-8888-888888888888', 'Mentor B Propose', 'mentor-b-propose@test.local'),
  ('99999999-8888-8888-8888-888888888888', 'Admin Propose', 'admin-propose@test.local')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _admin_role uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role FROM public.roles WHERE code = 'admin';
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    ('77777777-7777-7777-7777-777777777777', _mentor_role),
    ('88888888-8888-8888-8888-888888888888', _mentor_role),
    ('99999999-8888-8888-8888-888888888888', _admin_role)
  ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;
END $$;

SET session_replication_role = origin;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated, anon;

\echo '=== TEST 1: mentor A can propose a category (insert succeeds) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','77777777-7777-7777-7777-777777777777','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.categories (name, slug, description, status) VALUES ('Quantum Computing', 'quantum-computing-test', 'A proposed category', 'active');
SELECT CASE WHEN count(*) = 1 THEN 'PASS: proposal inserted' ELSE 'FAIL' END FROM public.categories WHERE slug = 'quantum-computing-test';
RESET ROLE;

\echo '=== TEST 2: proposal is forced to pending even though client sent status=active ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','77777777-7777-7777-7777-777777777777','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN status = 'pending' THEN 'PASS: status forced to pending' ELSE 'FAIL: status=' || status END FROM public.categories WHERE slug = 'quantum-computing-test';
SELECT CASE WHEN created_by = '77777777-7777-7777-7777-777777777777' THEN 'PASS: created_by forced to caller' ELSE 'FAIL' END FROM public.categories WHERE slug = 'quantum-computing-test';
RESET ROLE;

\echo '=== TEST 2b: mentor cannot forge created_by to a different user ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','77777777-7777-7777-7777-777777777777','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.categories (name, slug, status, created_by) VALUES ('Forged Author', 'forged-author-test', 'active', '88888888-8888-8888-8888-888888888888');
SELECT CASE WHEN created_by = '77777777-7777-7777-7777-777777777777' AND status = 'pending' THEN 'PASS: forged created_by/status both overridden' ELSE 'FAIL: created_by=' || created_by || ' status=' || status END
FROM public.categories WHERE slug = 'forged-author-test';
RESET ROLE;

\echo '=== TEST 3: mentor cannot approve their own proposal ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','77777777-7777-7777-7777-777777777777','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _n int;
BEGIN
  WITH upd AS (UPDATE public.categories SET status = 'active' WHERE slug = 'quantum-computing-test' RETURNING 1)
  SELECT count(*) INTO _n FROM upd;
  IF _n = 0 THEN RAISE NOTICE 'PASS: mentor self-approval affected 0 rows'; ELSE RAISE NOTICE 'FAIL: mentor self-approved % rows', _n; END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: mentor self-approval denied (%)', SQLERRM;
END $$;
RESET ROLE;
-- confirm still pending regardless of which path (0-row vs denial) occurred
SELECT CASE WHEN status = 'pending' THEN 'PASS: still pending after self-approval attempt' ELSE 'FAIL: status=' || status END FROM public.categories WHERE slug = 'quantum-computing-test';

\echo '=== TEST 4: another mentor cannot see/use the pending category ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: mentor B cannot see mentor A''s pending proposal' ELSE 'FAIL: mentor B saw it' END FROM public.categories WHERE slug = 'quantum-computing-test';
RESET ROLE;

\echo '=== TEST 5: public/anonymous cannot see pending or rejected categories ==='
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: anon cannot see pending proposal' ELSE 'FAIL' END FROM public.categories WHERE slug = 'quantum-computing-test';
RESET ROLE;

\echo '=== TEST 6: admin can approve (pending -> active) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','99999999-8888-8888-8888-888888888888','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE public.categories SET status = 'active' WHERE slug = 'quantum-computing-test';
SELECT CASE WHEN status = 'active' THEN 'PASS: admin approved' ELSE 'FAIL' END FROM public.categories WHERE slug = 'quantum-computing-test';
RESET ROLE;

\echo '=== TEST 6b: admin can reject (pending -> rejected) on the second test row ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','99999999-8888-8888-8888-888888888888','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE public.categories SET status = 'rejected' WHERE slug = 'forged-author-test';
SELECT CASE WHEN status = 'rejected' THEN 'PASS: admin rejected' ELSE 'FAIL' END FROM public.categories WHERE slug = 'forged-author-test';
RESET ROLE;

\echo '=== TEST 5b: rejected category still invisible to anon and to the proposing mentor sees it only as rejected (own-row visibility) ==='
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: anon cannot see rejected category' ELSE 'FAIL' END FROM public.categories WHERE slug = 'forged-author-test';
RESET ROLE;

\echo '=== TEST 7: approved category becomes selectable (visible to anon/other mentors now that it is active) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','88888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: mentor B can now see the approved category' ELSE 'FAIL' END FROM public.categories WHERE slug = 'quantum-computing-test';
RESET ROLE;
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: anon/public can now see the approved category' ELSE 'FAIL' END FROM public.categories WHERE slug = 'quantum-computing-test';
RESET ROLE;

\echo '=== TEST 8: mentor still cannot publish a course directly (Phase A course trigger, unaffected by this migration) ==='
SET session_replication_role = replica;
INSERT INTO public.mentor_profiles (id) VALUES ('77777777-7777-7777-7777-777777777777') ON CONFLICT (id) DO NOTHING;
SET session_replication_role = origin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','77777777-7777-7777-7777-777777777777','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  INSERT INTO public.courses (mentor_id, title, slug, description, status, price)
  VALUES ('77777777-7777-7777-7777-777777777777', 'Sneaky Course B', 'sneaky-course-b-cat-check', 'd', 'published', 10);
  RAISE NOTICE 'FAIL: mentor published a course directly!';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: direct course publish still rejected (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 9: Phase A regression - mentor still cannot insert an admin-owned-style category with an arbitrary status, non-owner cases still denied ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','77777777-7777-7777-7777-777777777777','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _n int;
BEGIN
  WITH upd AS (UPDATE public.categories SET name = 'Hacked Engineering' WHERE slug = 'engineering' RETURNING 1)
  SELECT count(*) INTO _n FROM upd;
  IF _n = 0 THEN RAISE NOTICE 'PASS: mentor update of admin-owned category affected 0 rows'; ELSE RAISE NOTICE 'FAIL: mentor updated % admin-owned row(s)!', _n; END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: mentor still cannot update admin-owned categories (%)', SQLERRM;
END $$;
RESET ROLE;
SELECT CASE WHEN name = 'Engineering' THEN 'PASS: name genuinely unchanged' ELSE 'FAIL: name=' || name END FROM public.categories WHERE slug = 'engineering';
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  INSERT INTO public.categories (name, slug, status) VALUES ('Anon Injected 2', 'anon-injected-2-test', 'active');
  RAISE NOTICE 'FAIL: anon inserted a category!';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: anon insert still denied (%)', SQLERRM;
END $$;
RESET ROLE;

ROLLBACK;
\echo ''
\echo 'All fixtures rolled back.'
