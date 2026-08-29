-- ============================================================================
-- CRITICAL SECURITY FIX: system_settings was readable by anyone.
-- ============================================================================
-- WHY: consolidated_select on public.system_settings was
--      `USING (has_role('admin') OR true)` - the `OR true` makes the admin
--      check dead code; the policy evaluates to true for every role,
--      including anon. Confirmed exploitable: the table currently holds a
--      payment-gateway row (Razorpay key id) and an SMTP config row, both
--      readable via a plain anon-key PostgREST select. INSERT/UPDATE/DELETE
--      were already correctly admin-only; only SELECT had this hole.
--
-- Confirmed via repo-wide grep that system_settings has exactly one
-- consumer, CMSService.getSetting/setSetting (src/services/cms.service.ts),
-- itself only ever called from admin-only hooks (src/hooks/admin/useAdminCMS.ts)
-- - there is no public/anonymous read path anywhere in the app that this
-- narrows. Purely a fix, not a functionality change.
-- ============================================================================
DROP POLICY IF EXISTS consolidated_select ON public.system_settings;
CREATE POLICY consolidated_select ON public.system_settings FOR SELECT
USING (has_role('admin'));
