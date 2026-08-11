-- ============================================================================
-- Regression test script for the Phase J mentor job-posting migration
-- (20260812000001_mentor_job_postings.sql).
--
-- *** LOCAL / TEST DATABASE ONLY - NEVER RUN AGAINST PRODUCTION. ***
--
-- Usage: `supabase start --ignore-health-check` (Windows), then:
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     < supabase/tests/mentor_job_postings_rls.test.sql
-- ============================================================================
\pset pager off
BEGIN;

SET session_replication_role = replica;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('e0000000-0000-0000-0000-00000000000a', 'admin-job@test.local',    crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('e0000000-0000-0000-0000-00000000000b', 'mentor-a-job@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('e0000000-0000-0000-0000-00000000000c', 'mentor-b-job@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('e0000000-0000-0000-0000-00000000000d', 'student-x-job@test.local',crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email) VALUES
  ('e0000000-0000-0000-0000-00000000000a', 'Admin Job',    'admin-job@test.local'),
  ('e0000000-0000-0000-0000-00000000000b', 'Mentor A Job', 'mentor-a-job@test.local'),
  ('e0000000-0000-0000-0000-00000000000c', 'Mentor B Job', 'mentor-b-job@test.local'),
  ('e0000000-0000-0000-0000-00000000000d', 'Student X Job','student-x-job@test.local')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _admin_role uuid; _student_role uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role FROM public.roles WHERE code = 'admin';
  SELECT id INTO _student_role FROM public.roles WHERE code = 'student';
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    ('e0000000-0000-0000-0000-00000000000a', _admin_role),
    ('e0000000-0000-0000-0000-00000000000b', _mentor_role),
    ('e0000000-0000-0000-0000-00000000000c', _mentor_role),
    ('e0000000-0000-0000-0000-00000000000d', _student_role)
  ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;
END $$;

INSERT INTO public.mentor_profiles (id) VALUES
  ('e0000000-0000-0000-0000-00000000000b'),
  ('e0000000-0000-0000-0000-00000000000c')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hiring_partners (id, name, slug) VALUES
  ('e0000000-0000-0000-0000-0000000000f1', 'Acme Corp Job Test', 'acme-corp-job-test')
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = origin;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_postings, public.hiring_partners TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.placement_applications, public.application_documents, public.interview_rounds, public.placement_offers, public.placement_status_history TO authenticated;
GRANT SELECT ON public.interview_feedback TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- ============================================================================
-- Mentor-authored job posting lifecycle
-- ============================================================================

\echo '=== TEST 1a: mentor A cannot INSERT a posting directly as status=open - the insert itself is rejected (matches the courses trigger precedent exactly, not a silent downgrade) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  INSERT INTO public.job_postings (id, hiring_partner_id, title, description, status, created_by)
  VALUES ('e0000000-0000-0000-0000-0000000000d0', 'e0000000-0000-0000-0000-0000000000f1', 'Sneaky Open Posting', 'Job description', 'open', 'e0000000-0000-0000-0000-00000000000b');
  RAISE NOTICE 'FAIL: mentor inserted a posting directly as open!';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: direct non-draft insert rejected (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 1b: mentor A inserts a proper draft posting (the real client flow) - created_by forced to caller even if a different value is sent ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.job_postings (id, hiring_partner_id, title, description, status, created_by)
VALUES ('e0000000-0000-0000-0000-0000000000d1', 'e0000000-0000-0000-0000-0000000000f1', 'Backend Engineer', 'Job description', 'draft', 'e0000000-0000-0000-0000-00000000000c');
SELECT CASE WHEN status = 'draft' THEN 'PASS: draft insert succeeded' ELSE 'FAIL: status=' || status END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
SELECT CASE WHEN created_by = 'e0000000-0000-0000-0000-00000000000b' THEN 'PASS: created_by forced to caller (forged value overridden)' ELSE 'FAIL' END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 2: mentor A submits for review (draft -> under_review) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE public.job_postings SET status = 'under_review' WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
SELECT CASE WHEN status = 'under_review' THEN 'PASS: submitted for review' ELSE 'FAIL: status=' || status END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 3: mentor A cannot self-approve (under_review -> open) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _n int;
BEGIN
  WITH upd AS (UPDATE public.job_postings SET status = 'open' WHERE id = 'e0000000-0000-0000-0000-0000000000d1' RETURNING 1)
  SELECT count(*) INTO _n FROM upd;
  IF _n = 0 THEN RAISE NOTICE 'PASS: mentor self-publish affected 0 rows'; ELSE RAISE NOTICE 'FAIL: mentor self-published % rows', _n; END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: mentor self-publish denied (%)', SQLERRM;
END $$;
RESET ROLE;
SELECT CASE WHEN status = 'under_review' THEN 'PASS: still under_review after self-publish attempt' ELSE 'FAIL: status=' || status END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';

\echo '=== TEST 4: notify_admins_job_submitted succeeds for the owning mentor while under_review ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.notify_admins_job_submitted('e0000000-0000-0000-0000-0000000000d1');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: admin received exactly one job-submission notification' ELSE 'FAIL: ' || count(*) END
FROM public.notifications WHERE recipient_id = 'e0000000-0000-0000-0000-00000000000a' AND metadata->>'job_posting_id' = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 4b: notify_admins_job_submitted denies a non-owner mentor ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.notify_admins_job_submitted('e0000000-0000-0000-0000-0000000000d1');
  RAISE NOTICE 'FAIL: mentor B notified admins about mentor A''s posting!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: non-owner notify_admins_job_submitted denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 5: mentor B cannot edit mentor A''s job posting ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _n int;
BEGIN
  WITH upd AS (UPDATE public.job_postings SET title = 'Hacked Title' WHERE id = 'e0000000-0000-0000-0000-0000000000d1' RETURNING 1)
  SELECT count(*) INTO _n FROM upd;
  IF _n = 0 THEN RAISE NOTICE 'PASS: mentor B update of mentor A''s posting affected 0 rows'; ELSE RAISE NOTICE 'FAIL: mentor B updated % rows', _n; END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: mentor B update denied (%)', SQLERRM;
END $$;
RESET ROLE;
SELECT CASE WHEN title = 'Backend Engineer' THEN 'PASS: title genuinely unchanged' ELSE 'FAIL: title=' || title END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';

\echo '=== TEST 6: mentor B cannot see mentor A''s under_review posting (not yet public, not admin, not owner) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: mentor B cannot see mentor A''s under_review posting' ELSE 'FAIL' END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 7: anon cannot see the under_review posting either ==='
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: anon cannot see under_review posting' ELSE 'FAIL' END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 8: admin approves (under_review -> open) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE public.job_postings SET status = 'open' WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
SELECT CASE WHEN status = 'open' THEN 'PASS: admin approved and published' ELSE 'FAIL' END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 9: anon/public can now see the open posting ==='
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: anon can see the now-open posting' ELSE 'FAIL' END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 10: mentor A (owner) can close their own live posting without admin ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE public.job_postings SET status = 'closed' WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
SELECT CASE WHEN status = 'closed' THEN 'PASS: mentor closed their own posting' ELSE 'FAIL' END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 11: mentor A can reopen their own previously-approved posting without re-review ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE public.job_postings SET status = 'open' WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
SELECT CASE WHEN status = 'open' THEN 'PASS: mentor reopened their own posting' ELSE 'FAIL' END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 12: mentor A can archive their own posting (open -> cancelled) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
UPDATE public.job_postings SET status = 'cancelled' WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
SELECT CASE WHEN status = 'cancelled' THEN 'PASS: mentor archived their own posting' ELSE 'FAIL' END FROM public.job_postings WHERE id = 'e0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 13: a brand-new draft still cannot be published directly by its mentor owner ==='
SET session_replication_role = replica;
INSERT INTO public.job_postings (id, hiring_partner_id, title, description, status, created_by)
VALUES ('e0000000-0000-0000-0000-0000000000d2', 'e0000000-0000-0000-0000-0000000000f1', 'Frontend Engineer', 'Job description', 'draft', 'e0000000-0000-0000-0000-00000000000b')
ON CONFLICT (id) DO NOTHING;
SET session_replication_role = origin;
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _n int;
BEGIN
  WITH upd AS (UPDATE public.job_postings SET status = 'open' WHERE id = 'e0000000-0000-0000-0000-0000000000d2' RETURNING 1)
  SELECT count(*) INTO _n FROM upd;
  IF _n = 0 THEN RAISE NOTICE 'PASS: draft -> open direct publish affected 0 rows'; ELSE RAISE NOTICE 'FAIL: mentor published a draft directly (% rows)', _n; END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: draft -> open direct publish denied (%)', SQLERRM;
END $$;
RESET ROLE;

-- ============================================================================
-- Applicant visibility for the owning mentor
-- ============================================================================

\echo '=== TEST 14: mentor A can see applicants for their own (now-cancelled but previously open) posting; mentor B cannot ==='
SET session_replication_role = replica;
INSERT INTO public.placement_applications (id, job_posting_id, student_id, status)
VALUES ('e0000000-0000-0000-0000-0000000000e1', 'e0000000-0000-0000-0000-0000000000d1', 'e0000000-0000-0000-0000-00000000000d', 'applied')
ON CONFLICT (id) DO NOTHING;
SET session_replication_role = origin;

SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: owning mentor A can see the applicant' ELSE 'FAIL' END FROM public.placement_applications WHERE id = 'e0000000-0000-0000-0000-0000000000e1';
RESET ROLE;

SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: mentor B (not the job owner) cannot see the applicant' ELSE 'FAIL' END FROM public.placement_applications WHERE id = 'e0000000-0000-0000-0000-0000000000e1';
RESET ROLE;

\echo '=== TEST 15: the applicant student can still see their own application (unaffected regression check) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000d','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: student still sees their own application' ELSE 'FAIL' END FROM public.placement_applications WHERE id = 'e0000000-0000-0000-0000-0000000000e1';
RESET ROLE;

\echo '=== TEST 16: interview_feedback stays admin-only (NOT extended to the owning mentor) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','e0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: owning mentor still cannot read interview_feedback (admin-internal by design)' ELSE 'FAIL' END FROM public.interview_feedback;
RESET ROLE;

ROLLBACK;
\echo ''
\echo 'All fixtures rolled back.'
