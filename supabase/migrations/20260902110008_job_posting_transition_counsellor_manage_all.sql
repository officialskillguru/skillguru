-- Phase 8 (cont.): the RLS grant alone isn't enough -- enforce_job_posting_transition
-- hard-codes "admin only" bypasses (ownership check and the publish/open gate) ahead of
-- RLS. Extend both bypasses to anyone holding jobs.manage_all (Counsellor), matching the
-- brief's explicit "Admin and Counsellor-authorized users: full CRUD on Jobs/Internships"
-- (task brief §13). Mentor's own-posting-only, admin-gated-publish path is unchanged.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02.
-- Verified live (rolled-back transactions, disposable QA hiring-partner rows):
-- counsellor can create a posting with status='open' directly; a plain mentor is still
-- blocked from doing so and gets the "requires admin or counsellor authority" error.

CREATE OR REPLACE FUNCTION public.enforce_job_posting_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    _old_status text;
    _new_status text;
    _full_manage boolean;
BEGIN
    _new_status := NEW.status;

    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    _full_manage := public.has_role('admin') OR public.has_permission('jobs.manage_all');

    IF _full_manage THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.created_by := auth.uid();
        IF _new_status IS DISTINCT FROM 'draft' THEN
            RAISE EXCEPTION 'Only an admin or counsellor may create a job posting with status ''%''. New postings must start as draft.', _new_status
                USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    _old_status := OLD.status;

    IF OLD.created_by IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'You may only modify your own job postings.' USING ERRCODE = '42501';
    END IF;
    NEW.created_by := OLD.created_by;

    IF _new_status IS NOT DISTINCT FROM _old_status THEN
        RETURN NEW;
    END IF;

    IF (_old_status, _new_status) IN (
        ('draft', 'under_review'),
        ('under_review', 'draft'),
        ('draft', 'cancelled'),
        ('under_review', 'cancelled'),
        ('open', 'closed'),
        ('closed', 'open'),
        ('closed', 'cancelled'),
        ('open', 'cancelled')
    ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Job posting status cannot be changed from ''%'' to ''%'' by this user. This transition requires admin or counsellor authority.', _old_status, _new_status
        USING ERRCODE = '42501';
END;
$function$;
