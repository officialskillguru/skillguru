-- DATA INTEGRITY FIX: handle_new_user() unconditionally assigns the 'student'
-- role to every new auth.users row (its own comment calls this a bootstrapping
-- "default role"). create-mentor/create-counsellor (and any other admin-driven
-- account provisioning that calls auth.admin.createUser()) fire this same
-- trigger, then separately assign the real intended role (mentor/counsellor/
-- admin) without ever revoking the trigger's default student grant - so every
-- Teacher/Counsellor/Admin account ends up ALSO holding an active student role.
--
-- Confirmed live: the Admin Students list (which queries user_roles for the
-- student role) showed real Teacher, Counsellor, and Admin accounts as if they
-- were students, because their student role row was genuinely active
-- (revoked_at IS NULL) - not a UI display bug, a real extra grant.
--
-- Soft-revoke only (sets revoked_at, does not delete the row) for accounts
-- that hold an operational role (admin/mentor/counsellor) alongside student,
-- consistent with how this schema already treats role revocation everywhere
-- else (has_role()/has_permission() both already filter on revoked_at IS NULL,
-- so this takes effect immediately with no other schema change).
update public.user_roles ur
set revoked_at = now()
from public.roles r_student
where ur.role_id = r_student.id
  and r_student.code = 'student'
  and ur.revoked_at is null
  and exists (
    select 1
    from public.user_roles ur2
    join public.roles r2 on r2.id = ur2.role_id
    where ur2.user_id = ur.user_id
      and ur2.revoked_at is null
      and r2.code in ('admin', 'mentor', 'counsellor')
  );
