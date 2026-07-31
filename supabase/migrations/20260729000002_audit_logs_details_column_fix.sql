-- Pre-existing bug found during Enterprise Mentor Management Phase 1 live
-- verification: log_audit_event() (defined in 20260718000005_enterprise_features.sql)
-- inserts into a `details` column that was never actually present on the live
-- audit_logs table (schema drift — every call to this RPC has been silently
-- failing with 42703 since it was introduced; nothing called it until now).
-- Additive fix: add the missing column rather than changing the function's
-- signature or the 4 other ad-hoc audit_logs write paths.

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;
