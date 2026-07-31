-- =============================================================================
-- Migration: 20260718000010_seed_permissions_roles.sql
-- Version:   1.0.0
-- Description:
--   Seeds the default permissions and maps them to standard roles.
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. Insert Core Permissions
-- ============================================================================
INSERT INTO public.permissions (slug, name, module, description)
VALUES 
    -- Course Management
    ('mentor.course.read', 'View Assigned Courses', 'course', 'Allows mentor to view courses assigned to them.'),
    ('mentor.course.create', 'Create Course content', 'course', 'Allows mentor to add content to their courses.'),
    ('mentor.course.update', 'Update Assigned Courses', 'course', 'Allows mentor to update their assigned courses.'),
    
    -- Student Management
    ('mentor.student.read', 'View Assigned Students', 'student', 'Allows mentor to view students assigned to them.'),
    ('mentor.student.assign', 'Assign Students', 'student', 'Allows mentor to assign themselves to students.'),
    
    -- CRM
    ('mentor.crm.read', 'View Mentor CRM', 'crm', 'Access to the mentor CRM workspace.'),
    ('mentor.crm.update', 'Update CRM Records', 'crm', 'Allows updating leads, tasks, and notes.'),
    
    -- Realtime & Communications
    ('mentor.chat.access', 'Access Chat', 'communication', 'Allows mentor to chat with students and admins.'),
    ('mentor.calendar.manage', 'Manage Calendar', 'scheduling', 'Allows mentor to create and manage sessions.'),
    
    -- Admin Overrides
    ('admin.user.manage', 'Manage All Users', 'admin', 'Allows admin to manage all mentors, students, and staff.'),
    ('admin.course.manage', 'Manage All Courses', 'admin', 'Allows admin full access to all courses.'),
    ('admin.system.settings', 'Manage System Settings', 'admin', 'Allows admin to configure platform settings.')
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- 2. Map Permissions to Roles
-- ============================================================================
DO $$ 
DECLARE
    r_mentor_id uuid;
    r_admin_id uuid;
    p_id uuid;
    p_slug text;
BEGIN
    -- Get Role IDs
    SELECT id INTO r_mentor_id FROM public.roles WHERE name = 'mentor';
    SELECT id INTO r_admin_id FROM public.roles WHERE name = 'admin';

    -- Only proceed if the mentor role exists
    IF r_mentor_id IS NOT NULL THEN
        -- Assign all mentor.* permissions to the mentor role
        FOR p_id, p_slug IN SELECT id, slug FROM public.permissions WHERE slug LIKE 'mentor.%'
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id) 
            VALUES (r_mentor_id, p_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
    END IF;

    -- Only proceed if the admin role exists
    IF r_admin_id IS NOT NULL THEN
        -- Assign ALL permissions to the admin role (for testing/setup)
        FOR p_id, p_slug IN SELECT id, slug FROM public.permissions
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id) 
            VALUES (r_admin_id, p_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;

COMMIT;
