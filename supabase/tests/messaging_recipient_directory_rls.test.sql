-- ============================================================================
-- Regression test for list_authorized_message_recipients()
-- (20260809000001_messaging_recipient_directory.sql).
--
-- *** LOCAL / TEST DATABASE ONLY - NEVER RUN AGAINST PRODUCTION. ***
-- ============================================================================
\pset pager off
BEGIN;

SET session_replication_role = replica;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('d0000000-0000-0000-0000-00000000000a', 'admin-dir@test.local',    crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-00000000000b', 'mentor-a-dir@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-00000000000c', 'mentor-b-dir@test.local', crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-00000000000d', 'student-x-dir@test.local',crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('d0000000-0000-0000-0000-00000000000e', 'student-y-dir@test.local',crypt('x', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email) VALUES
  ('d0000000-0000-0000-0000-00000000000a', 'Admin Dir',    'admin-dir@test.local'),
  ('d0000000-0000-0000-0000-00000000000b', 'Mentor A Dir', 'mentor-a-dir@test.local'),
  ('d0000000-0000-0000-0000-00000000000c', 'Mentor B Dir', 'mentor-b-dir@test.local'),
  ('d0000000-0000-0000-0000-00000000000d', 'Student X Dir','student-x-dir@test.local'),
  ('d0000000-0000-0000-0000-00000000000e', 'Student Y Dir','student-y-dir@test.local')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE _mentor_role uuid; _admin_role uuid; _student_role uuid;
BEGIN
  SELECT id INTO _mentor_role FROM public.roles WHERE code = 'mentor';
  SELECT id INTO _admin_role FROM public.roles WHERE code = 'admin';
  SELECT id INTO _student_role FROM public.roles WHERE code = 'student';
  INSERT INTO public.user_roles (user_id, role_id) VALUES
    ('d0000000-0000-0000-0000-00000000000a', _admin_role),
    ('d0000000-0000-0000-0000-00000000000b', _mentor_role),
    ('d0000000-0000-0000-0000-00000000000c', _mentor_role),
    ('d0000000-0000-0000-0000-00000000000d', _student_role),
    ('d0000000-0000-0000-0000-00000000000e', _student_role)
  ON CONFLICT (user_id, role_id) DO UPDATE SET revoked_at = NULL;
END $$;

INSERT INTO public.mentor_profiles (id) VALUES
  ('d0000000-0000-0000-0000-00000000000b'),
  ('d0000000-0000-0000-0000-00000000000c')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, mentor_id, title, slug, description, status, price) VALUES
  ('d0000000-0000-0000-0000-0000000000c1', 'd0000000-0000-0000-0000-00000000000b', 'Mentor A Dir Course', 'mentor-a-dir-course', 'd', 'published', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.enrollments (student_id, course_id) VALUES
  ('d0000000-0000-0000-0000-00000000000d', 'd0000000-0000-0000-0000-0000000000c1')
ON CONFLICT DO NOTHING;

SET session_replication_role = origin;

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.conversations, public.conversation_members TO authenticated;

\echo '=== TEST 1: mentor A sees admin, mentor B, and student X (enrolled) - never student Y ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','d0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000a') = 1 THEN 'PASS: admin listed' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000c') = 1 THEN 'PASS: mentor B listed' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000d') = 1 THEN 'PASS: enrolled student X listed' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000e') = 0 THEN 'PASS: unenrolled student Y NOT listed' ELSE 'FAIL: student Y leaked' END FROM public.list_authorized_message_recipients();
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000b') = 0 THEN 'PASS: caller does not list themselves' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
RESET ROLE;

\echo '=== TEST 2: student X sees only mentor A (their mentor) and admin - never student Y or mentor B ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','d0000000-0000-0000-0000-00000000000d','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000b') = 1 THEN 'PASS: own mentor listed' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000a') = 1 THEN 'PASS: admin listed' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000c') = 0 THEN 'PASS: unrelated mentor B NOT listed' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000e') = 0 THEN 'PASS: student Y NOT listed (no student-to-student)' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
RESET ROLE;

\echo '=== TEST 3: admin sees everyone except themselves ==='
SELECT set_config('request.jwt.claims', json_build_object('sub','d0000000-0000-0000-0000-00000000000a','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) >= 4 THEN 'PASS: admin sees >= 4 recipients' ELSE 'FAIL: only ' || count(*) END FROM public.list_authorized_message_recipients();
SELECT CASE WHEN count(*) FILTER (WHERE id = 'd0000000-0000-0000-0000-00000000000a') = 0 THEN 'PASS: admin does not list themselves' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
RESET ROLE;

\echo '=== TEST 4: anon gets an empty directory, not an error and not real data ==='
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
SELECT CASE WHEN count(*) = 0 THEN 'PASS: anon sees zero recipients' ELSE 'FAIL' END FROM public.list_authorized_message_recipients();
RESET ROLE;

\echo '=== TEST 5: notify_new_message notifies the other member and is denied to a non-member ==='
SET session_replication_role = replica;
INSERT INTO public.conversations (id, type, created_by) VALUES ('d0000000-0000-0000-0000-0000000000f1', 'direct', 'd0000000-0000-0000-0000-00000000000b') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
  ('d0000000-0000-0000-0000-0000000000f1', 'd0000000-0000-0000-0000-00000000000b'),
  ('d0000000-0000-0000-0000-0000000000f1', 'd0000000-0000-0000-0000-00000000000d')
ON CONFLICT DO NOTHING;
SET session_replication_role = origin;

SELECT set_config('request.jwt.claims', json_build_object('sub','d0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.notify_new_message('d0000000-0000-0000-0000-0000000000f1', 'Hello there');
RESET ROLE;

SELECT set_config('request.jwt.claims', json_build_object('sub','d0000000-0000-0000-0000-00000000000d','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: recipient got exactly one new-message notification' ELSE 'FAIL: ' || count(*) END
FROM public.notifications WHERE recipient_id = 'd0000000-0000-0000-0000-00000000000d' AND metadata->>'conversation_id' = 'd0000000-0000-0000-0000-0000000000f1';
RESET ROLE;

SELECT set_config('request.jwt.claims', json_build_object('sub','d0000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT public.notify_new_message('d0000000-0000-0000-0000-0000000000f1', 'Second message');
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub','d0000000-0000-0000-0000-00000000000d','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT CASE WHEN count(*) = 1 THEN 'PASS: still exactly one unread notification (anti-spam dedupe)' ELSE 'FAIL: ' || count(*) END
FROM public.notifications WHERE recipient_id = 'd0000000-0000-0000-0000-00000000000d' AND metadata->>'conversation_id' = 'd0000000-0000-0000-0000-0000000000f1';
RESET ROLE;

SELECT set_config('request.jwt.claims', json_build_object('sub','d0000000-0000-0000-0000-00000000000c','role','authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.notify_new_message('d0000000-0000-0000-0000-0000000000f1', 'Sneaky');
  RAISE NOTICE 'FAIL: non-member notified a conversation!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: non-member denied (%)', SQLERRM;
END $$;
RESET ROLE;

ROLLBACK;
\echo ''
\echo 'All fixtures rolled back.'
