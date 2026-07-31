-- Real bug found during Enterprise Mentor Management Phase 3 live browser
-- verification (as a genuinely logged-out visitor): get_mentor_available_slots()
-- (20260727000001_mentor_profile_content.sql) was never granted to `anon`,
-- so the public mentor profile page's booking widget silently 401'd for
-- every real anonymous visitor trying to check availability before signing
-- up - the exact audience the "Book Free Session" flow exists for. The
-- function is SECURITY DEFINER and only computes/returns open time slots
-- (no PII), so granting anon execute is safe.

GRANT EXECUTE ON FUNCTION public.get_mentor_available_slots(uuid, date, date, int) TO anon;
