-- Follow-up to 20260727073017_placement_module_schema.sql: the advisor
-- flagged all 7 new RPCs as anon-executable. `REVOKE ALL ... FROM PUBLIC`
-- does not reliably strip the default EXECUTE grant Postgres gives `anon`
-- on new functions in this project (same fix already needed once before,
-- for get_mentor_available_slots). Revoking from `anon` explicitly closes it.
-- (The original schema migration file has also been updated in place to
-- include these REVOKEs, so a fresh clone lands in the same end state.)

REVOKE ALL ON FUNCTION public.apply_to_job(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.withdraw_application(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.advance_application_stage(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.schedule_interview_round(uuid, integer, text, timestamptz, timestamptz, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_interview_feedback(uuid, text, text, integer, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.release_offer(uuid, numeric, text, text, date, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.mark_placement_joined(uuid) FROM anon;
