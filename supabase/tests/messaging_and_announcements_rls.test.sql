-- ============================================================================
-- Regression test script for the Phase C messaging/announcements migration
-- (20260808000001_messaging_and_announcements_foundation.sql).
--
-- *** LOCAL / TEST DATABASE ONLY - NEVER RUN AGAINST PRODUCTION. ***
--
-- Usage: `supabase start --ignore-health-check` (Windows), then:
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     < supabase/tests/messaging_and_announcements_rls.test.sql
-- ============================================================================
\pset pager off
BEGIN;

SET session_replication_role = replica;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('c0000000-0000-0000-0000-00000000000a', 'admin-msg@test.local',    crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-00000000000b', 'mentor-a-msg@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-00000000000c', 'mentor-b-msg@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-00000000000d', 'student-x-msg@test.local',crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-00000000000e', 'student-y-msg@test.local',crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email) VALUES
  ('c0000000-0000-0000-0000-00000000000a', 'Admin Msg',    'admin-msg@test.local'),
  ('c0000000-0000-0000-0000-00000000000b', 'Mentor A Msg', 'mentor-a-msg@test.local'),
  ('c0000000-0000-0000-0000-00000000000c', 'Mentor B Msg', 'mentor-b-msg@test.local'),
  ('c0000000-0000-0000-0000-00000000000d', 'Student X Msg','student-x-msg@test.local'),
  ('c0000000-0000-0000-0000-00000000000e', 'Student Y Msg','student-y-msg@test.local')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _admin_role uuid; _student_role uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role FROM public.roles WHERE code = 'admin';
  SELECT id INTO _student_role FROM public.roles WHERE code = 'student';
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    ('c0000000-0000-0000-0000-00000000000a', _admin_role),
    ('c0000000-0000-0000-0000-00000000000b', _mentor_role),
    ('c0000000-0000-0000-0000-00000000000c', _mentor_role),
    ('c0000000-0000-0000-0000-00000000000d', _student_role),
    ('c0000000-0000-0000-0000-00000000000e', _student_role)
  ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;
END $$;

INSERT INTO public.mentor_profiles (id) VALUES
  ('c0000000-0000-0000-0000-00000000000b'),
  ('c0000000-0000-0000-0000-00000000000c')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, mentor_id, title, slug, description, status, price) VALUES
  ('c0000000-0000-0000-0000-0000000000c1', 'c0000000-0000-0000-0000-00000000000b', 'Mentor A Course', 'mentor-a-msg-course', 'd', 'published', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.enrollments (student_id, course_id) VALUES
  ('c0000000-0000-0000-0000-00000000000d', 'c0000000-0000-0000-0000-0000000000c1')
ON CONFLICT DO NOTHING;

SET session_replication_role = origin;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations, public.conversation_members, public.chat_messages, public.message_attachments TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns, public.campaign_recipients TO authenticated;

-- ============================================================================
-- start_direct_conversation authorization boundary
-- ============================================================================

\echo '=== TEST 1: mentor A can start a conversation with admin ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.start_direct_conversation('c0000000-0000-0000-0000-00000000000a') AS conv_admin \gset
SELECT CASE WHEN :'conv_admin' IS NOT NULL THEN 'PASS: mentor-admin conversation created' ELSE 'FAIL' END;
SELECT CASE WHEN count(*) = 2 THEN 'PASS: both members inserted' ELSE 'FAIL: ' || count(*) || ' members' END FROM public.conversation_members WHERE conversation_id = :'conv_admin'::uuid;
RESET ROLE;

\echo '=== TEST 2: mentor A can start a conversation with student X (enrolled in mentor A''s course) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.start_direct_conversation('c0000000-0000-0000-0000-00000000000d') AS conv_ax \gset
SELECT CASE WHEN :'conv_ax' IS NOT NULL THEN 'PASS: mentor-student(enrolled) conversation created' ELSE 'FAIL' END;
RESET ROLE;

\echo '=== TEST 3: mentor A CANNOT start a conversation with student Y (not enrolled in any of mentor A''s courses) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.start_direct_conversation('c0000000-0000-0000-0000-00000000000e');
  RAISE NOTICE 'FAIL: mentor A reached an unenrolled student!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: mentor->unenrolled-student denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 4: student Y CANNOT start a conversation with mentor A (mirror of TEST 3) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000e','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.start_direct_conversation('c0000000-0000-0000-0000-00000000000b');
  RAISE NOTICE 'FAIL: unenrolled student reached mentor A!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: unenrolled-student->mentor denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 5: student X can start a conversation with mentor A, and it reuses the TEST 2 conversation (idempotent) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000d','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.start_direct_conversation('c0000000-0000-0000-0000-00000000000b') AS conv_xa \gset
SELECT CASE WHEN :'conv_xa' = :'conv_ax' THEN 'PASS: reused existing conversation (idempotent)' ELSE 'FAIL: created a duplicate conversation' END;
RESET ROLE;

\echo '=== TEST 5b: student X CANNOT start a conversation with student Y (student-to-student not an authorized pairing) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000d','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.start_direct_conversation('c0000000-0000-0000-0000-00000000000e');
  RAISE NOTICE 'FAIL: student X reached student Y!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: student->student denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 6: mentor A can start a conversation with mentor B (messages.mentor_to_mentor granted to the mentor role) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.start_direct_conversation('c0000000-0000-0000-0000-00000000000c') AS conv_ab \gset
SELECT CASE WHEN :'conv_ab' IS NOT NULL THEN 'PASS: mentor-mentor conversation created' ELSE 'FAIL' END;
RESET ROLE;

\echo '=== TEST 6b: without the permission, mentor<->mentor is denied (revoke scoped to this rolled-back transaction) ==='
DELETE FROM public.role_permissions WHERE permission_id = (SELECT id FROM public.permissions WHERE slug = 'messages.mentor_to_mentor');
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.start_direct_conversation('c0000000-0000-0000-0000-00000000000b');
  RAISE NOTICE 'FAIL: mentor-mentor conversation created without the permission!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: mentor-mentor denied once the permission is revoked (%)', SQLERRM;
END $$;
RESET ROLE;
-- restore for the remainder of the test file
DO $$
DECLARE _mentor_role uuid; _perm_id uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _perm_id FROM public.permissions WHERE slug = 'messages.mentor_to_mentor';
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES (_mentor_role, _perm_id) ON CONFLICT DO NOTHING;
END $$;

\echo '=== TEST 7: cannot start a conversation with yourself ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.start_direct_conversation('c0000000-0000-0000-0000-00000000000b');
  RAISE NOTICE 'FAIL: self-conversation allowed!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: self-conversation denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 8: nonexistent recipient is rejected ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.start_direct_conversation('00000000-0000-0000-0000-000000000000');
  RAISE NOTICE 'FAIL: nonexistent recipient allowed!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: nonexistent recipient denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 9: anon cannot call start_direct_conversation at all (no EXECUTE grant) ==='
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.start_direct_conversation('c0000000-0000-0000-0000-00000000000b');
  RAISE NOTICE 'FAIL: anon invoked start_direct_conversation!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: anon denied execute on start_direct_conversation (%)', SQLERRM;
END $$;
RESET ROLE;

-- ============================================================================
-- message_attachments ownership tightening
-- ============================================================================

\echo '=== TEST 10: mentor A sends a message in the mentor-admin conversation (fixture for attachment tests) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.chat_messages (id, conversation_id, sender_id, content)
VALUES ('c0000000-0000-0000-0000-0000000000f1', :'conv_admin'::uuid, 'c0000000-0000-0000-0000-00000000000b', 'Hello admin');
RESET ROLE;

\echo '=== TEST 11: mentor B (not the sender, not even a member) cannot attach a file to mentor A''s message ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  INSERT INTO public.message_attachments (message_id, file_name, file_type, storage_path)
  VALUES ('c0000000-0000-0000-0000-0000000000f1', 'evil.pdf', 'application/pdf', 'x/evil.pdf');
  RAISE NOTICE 'FAIL: mentor B attached a file to mentor A''s message!';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: non-sender attachment insert denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 12: mentor A (the actual sender) CAN attach a file to their own message ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.message_attachments (message_id, file_name, file_type, storage_path)
VALUES ('c0000000-0000-0000-0000-0000000000f1', 'notes.pdf', 'application/pdf', 'x/notes.pdf');
SELECT CASE WHEN count(*) = 1 THEN 'PASS: sender attached a file to their own message' ELSE 'FAIL' END FROM public.message_attachments WHERE message_id = 'c0000000-0000-0000-0000-0000000000f1';
RESET ROLE;

-- ============================================================================
-- campaigns / announcements
-- ============================================================================

\echo '=== TEST 13: mentor A can create an announcement addressed to my_students ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.campaigns (id, name, type, body, sender_id, audience_type)
VALUES ('c0000000-0000-0000-0000-0000000000d1', 'Welcome back', 'announcement', 'Hello students', 'c0000000-0000-0000-0000-00000000000b', 'my_students');
SELECT CASE WHEN count(*) = 1 THEN 'PASS: mentor announcement created' ELSE 'FAIL' END FROM public.campaigns WHERE id = 'c0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 14: mentor A CANNOT create an announcement addressed to all_students ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  INSERT INTO public.campaigns (name, type, body, sender_id, audience_type)
  VALUES ('Everyone!', 'announcement', 'Hello world', 'c0000000-0000-0000-0000-00000000000b', 'all_students');
  RAISE NOTICE 'FAIL: mentor addressed all_students!';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: mentor cannot address all_students (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 15: mentor A CANNOT create a non-announcement (email/whatsapp) campaign ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  INSERT INTO public.campaigns (name, type, body, sender_id, audience_type)
  VALUES ('Sneaky email', 'email', 'Hello', 'c0000000-0000-0000-0000-00000000000b', 'my_students');
  RAISE NOTICE 'FAIL: mentor created an email campaign!';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: mentor cannot create non-announcement campaigns (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 16: mentor B cannot see mentor A''s campaign ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: mentor B cannot see mentor A''s campaign' ELSE 'FAIL' END FROM public.campaigns WHERE id = 'c0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 17: mentor B cannot resolve audience for mentor A''s campaign (ownership check inside the RPC) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.resolve_campaign_audience('c0000000-0000-0000-0000-0000000000d1');
  RAISE NOTICE 'FAIL: mentor B resolved mentor A''s campaign audience!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: cross-mentor audience resolution denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 18: mentor A resolves my_students audience - only student X (enrolled), never student Y ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.resolve_campaign_audience('c0000000-0000-0000-0000-0000000000d1') AS resolved_count \gset
SELECT CASE WHEN :'resolved_count' = '1' THEN 'PASS: resolved exactly 1 recipient' ELSE 'FAIL: resolved ' || :'resolved_count' END;
SELECT CASE WHEN count(*) = 1 AND bool_and(recipient_id = 'c0000000-0000-0000-0000-00000000000d') THEN 'PASS: recipient is student X only' ELSE 'FAIL' END
FROM public.campaign_recipients WHERE campaign_id = 'c0000000-0000-0000-0000-0000000000d1';
RESET ROLE;

\echo '=== TEST 19: mentor A cannot see this via a direct INSERT on campaign_recipients (no such policy exists) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  INSERT INTO public.campaign_recipients (campaign_id, recipient_id)
  VALUES ('c0000000-0000-0000-0000-0000000000d1', 'c0000000-0000-0000-0000-00000000000e');
  RAISE NOTICE 'FAIL: mentor inserted a campaign_recipients row directly!';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: direct campaign_recipients insert denied - RPC is the only path (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 20: selected audience is clamped to the mentor''s own real students, not arbitrary ids ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.campaigns (id, name, type, body, sender_id, audience_type)
VALUES ('c0000000-0000-0000-0000-0000000000d2', 'Selected test', 'announcement', 'Hi', 'c0000000-0000-0000-0000-00000000000b', 'selected');
SELECT public.resolve_campaign_audience(
  'c0000000-0000-0000-0000-0000000000d2',
  ARRAY['c0000000-0000-0000-0000-00000000000d','c0000000-0000-0000-0000-00000000000e','c0000000-0000-0000-0000-00000000000c']::uuid[]
) AS selected_count \gset
SELECT CASE WHEN :'selected_count' = '1' THEN 'PASS: only the real enrolled student survived the clamp' ELSE 'FAIL: resolved ' || :'selected_count' END;
SELECT CASE WHEN count(*) = 1 AND bool_and(recipient_id = 'c0000000-0000-0000-0000-00000000000d') THEN 'PASS: clamped recipient is student X' ELSE 'FAIL' END
FROM public.campaign_recipients WHERE campaign_id = 'c0000000-0000-0000-0000-0000000000d2';
RESET ROLE;

\echo '=== TEST 21: admin can resolve all_students (student X and student Y both land) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.campaigns (id, name, type, body, sender_id, audience_type)
VALUES ('c0000000-0000-0000-0000-0000000000d3', 'Admin broadcast', 'announcement', 'Hi all', 'c0000000-0000-0000-0000-00000000000a', 'all_students');
SELECT public.resolve_campaign_audience('c0000000-0000-0000-0000-0000000000d3') AS admin_count \gset
SELECT CASE WHEN :'admin_count'::int >= 2 THEN 'PASS: admin all_students resolved >= 2 recipients' ELSE 'FAIL: resolved ' || :'admin_count' END;
RESET ROLE;

\echo '=== TEST 22: mentor B cannot resolve a course_cohort campaign against mentor A''s course ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.campaigns (id, name, type, body, sender_id, audience_type, course_id)
VALUES ('c0000000-0000-0000-0000-0000000000d4', 'Cross-mentor cohort', 'announcement', 'Hi', 'c0000000-0000-0000-0000-00000000000c', 'course_cohort', 'c0000000-0000-0000-0000-0000000000c1');
DO $$
BEGIN
  PERFORM public.resolve_campaign_audience('c0000000-0000-0000-0000-0000000000d4');
  RAISE NOTICE 'FAIL: mentor B resolved a cohort for mentor A''s course!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: cross-mentor course_cohort denied (%)', SQLERRM;
END $$;
RESET ROLE;

\echo '=== TEST 23: a cancelled enrollment is excluded from my_students - only the active enrollment survives ==='
SET session_replication_role = replica;
INSERT INTO public.enrollments (id, student_id, course_id, status) VALUES ('c0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-00000000000e', 'c0000000-0000-0000-0000-0000000000c1', 'cancelled') ON CONFLICT (id) DO NOTHING;
SET session_replication_role = origin;
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO public.campaigns (id, name, type, body, sender_id, audience_type)
VALUES ('c0000000-0000-0000-0000-0000000000d5', 'Cancelled-exclusion test', 'announcement', 'Hi', 'c0000000-0000-0000-0000-00000000000b', 'my_students');
SELECT public.resolve_campaign_audience('c0000000-0000-0000-0000-0000000000d5') AS cancelled_test_count \gset
SELECT CASE WHEN :'cancelled_test_count' = '1' THEN 'PASS: cancelled enrollment excluded, only the active student (X) resolved' ELSE 'FAIL: resolved ' || :'cancelled_test_count' END;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: cancelled student Y is not among the recipients' ELSE 'FAIL: cancelled student was included' END
FROM public.campaign_recipients WHERE campaign_id = 'c0000000-0000-0000-0000-0000000000d5' AND recipient_id = 'c0000000-0000-0000-0000-00000000000e';
RESET ROLE;

\echo '=== TEST 24: repeated start_direct_conversation calls for a brand-new pair never produce more than one conversation row (idempotency under the advisory-lock-guarded path) ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.start_direct_conversation('c0000000-0000-0000-0000-00000000000c') AS conv_race_1 \gset
SELECT public.start_direct_conversation('c0000000-0000-0000-0000-00000000000c') AS conv_race_2 \gset
SELECT public.start_direct_conversation('c0000000-0000-0000-0000-00000000000c') AS conv_race_3 \gset
SELECT CASE WHEN :'conv_race_1' = :'conv_race_2' AND :'conv_race_2' = :'conv_race_3' THEN 'PASS: repeated calls resolve to the same single conversation' ELSE 'FAIL: divergent conversation ids returned' END;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: exactly one direct conversation exists for this pair' ELSE 'FAIL: ' || count(*) || ' conversations exist for this pair' END
FROM public.conversations c
WHERE c.type = 'direct'
  AND EXISTS (SELECT 1 FROM public.conversation_members m1 WHERE m1.conversation_id = c.id AND m1.user_id = 'c0000000-0000-0000-0000-00000000000a')
  AND EXISTS (SELECT 1 FROM public.conversation_members m2 WHERE m2.conversation_id = c.id AND m2.user_id = 'c0000000-0000-0000-0000-00000000000c');
RESET ROLE;
-- NOTE: this is a sequential-call idempotency check, not a true concurrent-
-- connection race test (this test harness runs everything through one
-- psql connection/transaction). The pg_advisory_xact_lock in
-- start_direct_conversation is what makes genuine concurrent calls safe;
-- verifying that requires two real concurrent DB sessions, which is out of
-- scope for this single-connection SQL test script.

-- ============================================================================
-- Phase A / Phase B spot-check regression (full suites re-run separately)
-- ============================================================================

\echo '=== TEST 22: Phase B regression spot-check - mentor still cannot self-approve a category proposal ==='
SET session_replication_role = replica;
INSERT INTO public.categories (id, name, slug, status, created_by) VALUES ('c0000000-0000-0000-0000-0000000000e1', 'Msg Phase C Regression', 'msg-phase-c-regression', 'pending', 'c0000000-0000-0000-0000-00000000000b') ON CONFLICT (id) DO NOTHING;
SET session_replication_role = origin;
GRANT SELECT, UPDATE ON public.categories TO authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _n int;
BEGIN
  WITH upd AS (UPDATE public.categories SET status = 'active' WHERE slug = 'msg-phase-c-regression' RETURNING 1)
  SELECT count(*) INTO _n FROM upd;
  IF _n = 0 THEN RAISE NOTICE 'PASS: Phase B self-approval boundary still holds'; ELSE RAISE NOTICE 'FAIL: mentor self-approved % rows', _n; END IF;
END $$;
RESET ROLE;

ROLLBACK;
\echo ''
\echo 'All fixtures rolled back.'
