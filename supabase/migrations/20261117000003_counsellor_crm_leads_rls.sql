-- ============================================================================
-- Counsellor lead management: wire crm.read / crm.update into the lead tables.
-- ============================================================================
-- 20260902110001 granted the Counsellor role `crm.read` ("Read CRM
-- notes/leads/tasks") and `crm.update` ("Create/update CRM notes/leads/tasks"),
-- but 20260902110009 only applied them to mentor_notes. The leads,
-- lead_followups and lead_notes tables still allow admins only (plus mentors
-- for rows assigned to them), so a counsellor could not create or work a lead
-- (verified live: INSERT into leads -> RLS violation).
--
-- Additive: new permission-scoped policies alongside the existing admin and
-- mentor policies. No DELETE grant - leads are soft-deleted via deleted_at.
-- Students and anonymous users remain without access. Idempotent.
-- ============================================================================

-- leads ----------------------------------------------------------------------
DROP POLICY IF EXISTS "CRM readers view leads" ON public.leads;
CREATE POLICY "CRM readers view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_permission('crm.read'));

DROP POLICY IF EXISTS "CRM editors create leads" ON public.leads;
CREATE POLICY "CRM editors create leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('crm.update'));

DROP POLICY IF EXISTS "CRM editors update leads" ON public.leads;
CREATE POLICY "CRM editors update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_permission('crm.update'))
  WITH CHECK (public.has_permission('crm.update'));

-- lead_followups -------------------------------------------------------------
DROP POLICY IF EXISTS "CRM readers view followups" ON public.lead_followups;
CREATE POLICY "CRM readers view followups" ON public.lead_followups
  FOR SELECT TO authenticated
  USING (public.has_permission('crm.read'));

DROP POLICY IF EXISTS "CRM editors create followups" ON public.lead_followups;
CREATE POLICY "CRM editors create followups" ON public.lead_followups
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('crm.update'));

DROP POLICY IF EXISTS "CRM editors update followups" ON public.lead_followups;
CREATE POLICY "CRM editors update followups" ON public.lead_followups
  FOR UPDATE TO authenticated
  USING (public.has_permission('crm.update'))
  WITH CHECK (public.has_permission('crm.update'));

-- lead_notes (authors write as themselves) -----------------------------------
DROP POLICY IF EXISTS "CRM readers view lead notes" ON public.lead_notes;
CREATE POLICY "CRM readers view lead notes" ON public.lead_notes
  FOR SELECT TO authenticated
  USING (public.has_permission('crm.read'));

DROP POLICY IF EXISTS "CRM editors add lead notes" ON public.lead_notes;
CREATE POLICY "CRM editors add lead notes" ON public.lead_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('crm.update') AND author_id = auth.uid());

-- lead_activities (audit trail written by crmService.createLead/updateLead) --
DROP POLICY IF EXISTS "CRM readers view lead activities" ON public.lead_activities;
CREATE POLICY "CRM readers view lead activities" ON public.lead_activities
  FOR SELECT TO authenticated
  USING (public.has_permission('crm.read'));

DROP POLICY IF EXISTS "CRM editors log lead activities" ON public.lead_activities;
CREATE POLICY "CRM editors log lead activities" ON public.lead_activities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('crm.update'));
