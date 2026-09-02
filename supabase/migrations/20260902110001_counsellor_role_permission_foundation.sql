-- Phase 1: seed the Counsellor role and its explicit permission set.
-- Additive only: no existing role, permission, or user_roles row is modified or removed.
-- Mentor keeps every permission it already has (including mentor.crm.*, mentor.student.assign) —
-- narrowing Mentor's scope is deferred to a later phase, gated on the Counsellor portal
-- actually existing so no live mentor loses working functionality mid-migration.
-- Applied directly to production via mcp__supabase__apply_migration on 2026-09-02;
-- this file brings the local migration history back in sync.

insert into public.roles (code, name, description)
select 'counsellor', 'Counsellor', 'Operational management: students, courses, mentor/teacher profiles, course-teacher assignment, jobs/internships.'
where not exists (select 1 from public.roles where code = 'counsellor');

insert into public.permissions (slug, name, description, module)
select * from (values
  ('students.read',                 'View Students',                 'Read student profiles and enrollment data',        'student'),
  ('students.update',               'Update Students',                'Edit student operational data',                    'student'),
  ('students.assign',               'Assign Students',                'Assign students to mentors/cohorts',               'student'),
  ('mentors.read',                  'View Mentor Profiles',           'Read mentor/teacher profiles',                     'mentor_mgmt'),
  ('mentors.update',                'Update Mentor Profiles',         'Edit mentor/teacher profiles (not delete)',        'mentor_mgmt'),
  ('courses.assign_mentor',         'Assign Mentor To Course',        'Add/remove mentors on a course (many-to-many)',    'courses'),
  ('crm.read',                      'View CRM Records',               'Read CRM notes/leads/tasks',                       'crm'),
  ('crm.update',                    'Update CRM Records',             'Create/update CRM notes/leads/tasks',              'crm'),
  ('jobs.manage_all',               'Manage All Job Postings',        'Full CRUD on jobs/internships, not just own',      'placements'),
  ('messages.counsellor_access',    'Counsellor Messaging',           'Message Admin and Mentors as Counsellor',          'communication'),
  ('announcements.send_managed_students', 'Send Announcements To Managed Students', 'Broadcast to counsellor-managed student cohorts', 'communication')
) as v(slug, name, description, module)
where not exists (select 1 from public.permissions p where p.slug = v.slug);

-- Grant the new set to Counsellor, plus the existing course/category permissions the brief
-- calls for that already exist on the table (created earlier for Admin/Mentor).
with counsellor_role as (select id from public.roles where code = 'counsellor'),
     grant_slugs as (
       select unnest(array[
         'students.read','students.update','students.assign',
         'mentors.read','mentors.update',
         'courses.create','courses.update_all','courses.assign_mentor',
         'categories.propose',
         'crm.read','crm.update',
         'jobs.manage_all',
         'messages.counsellor_access','announcements.send_managed_students'
       ]) as slug
     )
insert into public.role_permissions (role_id, permission_id, is_active)
select cr.id, p.id, true
from counsellor_role cr
cross join grant_slugs gs
join public.permissions p on p.slug = gs.slug
where not exists (
  select 1 from public.role_permissions rp
  where rp.role_id = cr.id and rp.permission_id = p.id
);
