-- ============================================================================
-- Regression test script for the Phase A category taxonomy governance
-- migration (20260806000001_category_taxonomy_governance.sql).
--
-- *** LOCAL / TEST DATABASE ONLY - NEVER RUN AGAINST PRODUCTION. ***
-- Inserts throwaway auth.users/profiles/courses rows and grants broad
-- local-only table privileges (real hosted Supabase projects already have
-- these platform-level grants; a from-scratch local `supabase db reset`
-- does not). Everything runs inside BEGIN...ROLLBACK.
--
-- Usage: `supabase start --ignore-health-check` (Windows), then:
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     < supabase/tests/category_taxonomy_rls.test.sql
--
-- Before running, the 9 categories that exist only in the live production
-- database (never captured in any migration file - confirmed via direct
-- production inspection) must be simulated locally first, since Phase A's
-- seed migration reconciles against them by slug lookup:
--   INSERT INTO public.categories (name, slug, sort_order, status) VALUES
--     ('IT & Software Development', 'it-software-development', 10, 'active'),
--     ('AI & Data Science', 'ai-data-science', 20, 'active'),
--     ('Cloud Computing & DevOps', 'cloud-computing-devops', 30, 'active'),
--     ('Cybersecurity', 'cybersecurity', 40, 'active'),
--     ('Business & Management', 'business-management', 50, 'active'),
--     ('Digital Marketing', 'digital-marketing', 60, 'active'),
--     ('Finance & Accounting', 'finance-accounting', 70, 'active'),
--     ('UI/UX & Design', 'ui-ux-design', 80, 'active'),
--     ('Career & Soft Skills', 'career-soft-skills', 90, 'active')
--   ON CONFLICT (slug) DO NOTHING;
-- then re-run the seed migration (idempotent) before this test script.
--
-- Uses request.jwt.claims + SET LOCAL ROLE to impersonate anon/authenticated
-- principals the same way PostgREST does, all within one transaction so
-- SET LOCAL persists across statements (each top-level psql statement is
-- otherwise its own autocommit transaction and would silently drop the
-- impersonated role).
-- ============================================================================
\pset pager off
BEGIN;

SET session_replication_role = replica;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('55555555-5555-5555-5555-555555555555', 'mentor-test@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'admin-test@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email) VALUES
  ('55555555-5555-5555-5555-555555555555', 'Mentor Test', 'mentor-test@test.local'),
  ('66666666-6666-6666-6666-666666666666', 'Admin Test', 'admin-test@test.local')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _admin_role uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role FROM public.roles WHERE code = 'admin';
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    ('55555555-5555-5555-5555-555555555555', _mentor_role),
    ('66666666-6666-6666-6666-666666666666', _admin_role)
  ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;
END $$;

SET session_replication_role = origin;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated, anon;

\echo '=== TEST: mentor INSERT cannot create an ACTIVE category (superseded by Phase B - see note) ==='
-- NOTE: Phase A shipped with categories fully admin-only for INSERT, so this
-- test originally expected outright denial. Phase B (20260807000001_mentor_
-- category_proposals.sql) intentionally adds a controlled mentor INSERT path
-- (categories.propose): a mentor CAN now insert, but the row is forced to
-- status='pending' regardless of what they send - it can never land as
-- 'active'. This is the correct new boundary, exercised exhaustively by
-- supabase/tests/category_proposal_rls.test.sql (TEST 1/2/2b). This test is
-- updated in place (not left to perpetually fail) to assert the boundary
-- that actually matters: whatever the mentor sends, the row is never active.
SELECT set_config('request.jwt.claims', json_build_object('sub','55555555-5555-5555-5555-555555555555','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.categories (name, slug, status) VALUES ('Mentor Injected', 'mentor-injected', 'active');
SELECT CASE WHEN status = 'active' THEN 'FAIL: mentor category landed as active!' ELSE 'PASS: mentor insert landed as ''' || status || ''', never active' END
FROM public.categories WHERE slug = 'mentor-injected';
RESET ROLE;

\echo '=== TEST: mentor UPDATE denied ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','55555555-5555-5555-5555-555555555555','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _n int;
BEGIN
  WITH upd AS (UPDATE public.categories SET name = 'Hacked' WHERE slug = 'engineering' RETURNING 1)
  SELECT count(*) INTO _n FROM upd;
  IF _n = 0 THEN RAISE NOTICE 'PASS: mentor update affected 0 rows'; ELSE RAISE NOTICE 'FAIL: mentor updated % rows', _n; END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: mentor update denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST: mentor DELETE denied (use a leaf/no-children category to isolate from FK constraint) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','55555555-5555-5555-5555-555555555555','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _n int;
BEGIN
  WITH del AS (DELETE FROM public.categories WHERE slug = 'web-development' RETURNING 1)
  SELECT count(*) INTO _n FROM del;
  IF _n = 0 THEN RAISE NOTICE 'PASS: mentor delete affected 0 rows'; ELSE RAISE NOTICE 'FAIL: mentor deleted % rows', _n; END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: mentor delete denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST: anon INSERT denied ==='
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  INSERT INTO public.categories (name, slug, status) VALUES ('Anon Injected', 'anon-injected', 'active');
  RAISE NOTICE 'FAIL: anon inserted a category!';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: anon insert denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST: admin CAN insert, update, and delete (using a leaf category) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','66666666-6666-6666-6666-666666666666','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.categories (name, slug, status) VALUES ('Admin Created', 'admin-created', 'active');
SELECT CASE WHEN count(*) = 1 THEN 'PASS: admin insert succeeded' ELSE 'FAIL' END FROM public.categories WHERE slug = 'admin-created';
UPDATE public.categories SET description = 'updated by admin' WHERE slug = 'admin-created';
SELECT CASE WHEN description = 'updated by admin' THEN 'PASS: admin update succeeded' ELSE 'FAIL' END FROM public.categories WHERE slug = 'admin-created';
DELETE FROM public.categories WHERE slug = 'admin-created';
SELECT CASE WHEN count(*) = 0 THEN 'PASS: admin delete succeeded' ELSE 'FAIL' END FROM public.categories WHERE slug = 'admin-created';
RESET ROLE;

\echo '=== TEST: referenced category cannot be hard-deleted (FK protects against orphaning course_categories) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','66666666-6666-6666-6666-666666666666','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
-- attach a course to 'web-development' first (as service-role-equivalent for fixture setup)
RESET ROLE;
SET session_replication_role = replica;
INSERT INTO public.mentor_profiles (id) VALUES ('55555555-5555-5555-5555-555555555555') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.courses (id, mentor_id, title, slug, description, status, price)
VALUES ('99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', 'Test Course', 'test-course-cat-check', 'd', 'draft', 10)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.course_categories (course_id, category_id)
SELECT '99999999-9999-9999-9999-999999999999', id FROM public.categories WHERE slug = 'web-development'
ON CONFLICT DO NOTHING;
SET session_replication_role = origin;

SELECT set_config('request.jwt.claims', json_build_object('sub','66666666-6666-6666-6666-666666666666','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  DELETE FROM public.categories WHERE slug = 'web-development';
  RAISE NOTICE 'FAIL: referenced category was deleted!';
EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'PASS: referenced category delete blocked by FK (%)', SQLERRM;
END $$;
RESET ROLE;

ROLLBACK;
\echo 'All fixtures rolled back.'
