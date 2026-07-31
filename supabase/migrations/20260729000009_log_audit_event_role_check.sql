-- Real security gap found during the final Mentor Module production audit:
-- log_audit_event() (20260718000005_enterprise_features.sql) is SECURITY
-- DEFINER but had no role check inside it at all — any authenticated user
-- could call this RPC directly via PostgREST and insert arbitrary rows into
-- audit_logs (any action/entity_type/entity_id/old_values/new_values), only
-- actor_id was forced to auth.uid(). This can't be used to change mentor
-- data, but it lets any logged-in user pollute/spoof the audit trail the
-- CRM "Timeline" tab renders as ground truth. Every real call site in the
-- codebase is already admin-only, so this restriction changes no legitimate
-- behavior — it only closes the gap for a caller invoking the RPC directly.

CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action text,
    p_entity_type text,
    p_entity_id uuid DEFAULT NULL,
    p_old_values jsonb DEFAULT NULL,
    p_new_values jsonb DEFAULT NULL,
    p_details jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    IF NOT (public.has_role('admin') OR public.has_role('super_admin')) THEN
        RAISE EXCEPTION 'Only admins can write audit log entries' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.audit_logs (
        actor_id, action, entity_type, entity_id,
        old_values, new_values, details
    ) VALUES (
        auth.uid(), p_action, p_entity_type, p_entity_id,
        p_old_values, p_new_values, COALESCE(p_details, '{}'::jsonb)
    ) RETURNING id INTO log_id;
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
