-- =============================================================================
-- Migration: 011_platform_features.sql
-- Version:   1.0.0
-- Description:
--   Creates the missing platform features requested for the enterprise edition.
--   Tables: cart, wishlists, messages, notifications, coupon_codes, invoices,
--           payments, system_settings, testimonials, tags, course_tags, audit_logs.
--   Updates: permissions for refined RBAC (users.create, courses.manage, etc.)
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Refined Permissions (RBAC)
-- ============================================================================

INSERT INTO public.permissions (code, display_name, module, description) VALUES
    ('users.create',       'Create Users',        'users',     'Create new users manually'),
    ('users.update',       'Update Users',        'users',     'Update user details'),
    ('users.delete',       'Delete Users',        'users',     'Delete users'),
    ('courses.manage',     'Manage All Courses',  'courses',   'Super admin course management'),
    ('website.manage',     'Manage Website',      'website',   'Manage hero, testimonials, SEO'),
    ('analytics.view',     'View Global Analytics','analytics', 'View platform-wide analytics'),
    ('students.view.enrolled', 'View Enrolled',    'students',  'View enrolled students (Mentor)'),
    ('assignments.grade',  'Grade Assignments',   'learning',  'Grade assignments (Mentor)'),
    ('courses.purchase',   'Purchase Courses',    'commerce',  'Purchase courses'),
    ('courses.learn',      'Learn Courses',       'learning',  'Consume course content'),
    ('certificates.download','Download Certs',    'learning',  'Download certificates')
ON CONFLICT (code) DO NOTHING;

-- Map to Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p 
WHERE r.code = 'admin' AND p.code IN ('users.create', 'users.update', 'users.delete', 'courses.manage', 'website.manage', 'analytics.view')
ON CONFLICT DO NOTHING;

-- Map to Mentor
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p 
WHERE r.code = 'mentor' AND p.code IN ('students.view.enrolled', 'assignments.grade')
ON CONFLICT DO NOTHING;

-- Map to Student
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p 
WHERE r.code = 'student' AND p.code IN ('courses.purchase', 'courses.learn', 'certificates.download')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- SECTION 2: Audit Logging
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action          text NOT NULL,
    entity_type     text NOT NULL,
    entity_id       uuid,
    details         jsonb DEFAULT '{}'::jsonb,
    ip_address      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role('admin'));

-- ============================================================================
-- SECTION 3: Commerce Expansion (Cart, Wishlist, Coupons, Payments, Invoices)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cart (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.wishlists (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.coupon_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            text NOT NULL UNIQUE,
    discount_pct    numeric(5,2) NOT NULL CHECK (discount_pct >= 0 AND discount_pct <= 100),
    max_uses        int,
    times_used      int DEFAULT 0,
    valid_until     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount          numeric(10,2) NOT NULL,
    provider        text NOT NULL, -- e.g. 'razorpay'
    provider_id     text,
    status          text NOT NULL DEFAULT 'pending',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_number  text NOT NULL UNIQUE,
    pdf_url         text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cart" ON public.cart FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own wishlist" ON public.wishlists FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage coupons" ON public.coupon_codes FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Public read coupons" ON public.coupon_codes FOR SELECT USING (valid_until > now() OR valid_until IS NULL);
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Users view own invoices" ON public.invoices FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

-- ============================================================================
-- SECTION 4: Communication (Notifications, Messages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type            text NOT NULL,
    title           text NOT NULL,
    body            text NOT NULL,
    status          text NOT NULL DEFAULT 'unread',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         text NOT NULL,
    is_read         boolean DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "Admins manage all notifications" ON public.notifications FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Users view own messages" ON public.messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users insert own messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ============================================================================
-- SECTION 5: System Settings & Website Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id              text PRIMARY KEY,
    value           jsonb NOT NULL,
    updated_at      timestamptz NOT NULL DEFAULT now(),
    updated_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.testimonials (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id       uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    content         text NOT NULL,
    rating          int CHECK (rating >= 1 AND rating <= 5),
    is_approved     boolean DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL UNIQUE,
    slug            text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.course_tags (
    course_id       uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    tag_id          uuid REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage settings" ON public.system_settings FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
CREATE POLICY "Public read settings" ON public.system_settings FOR SELECT USING (true);

CREATE POLICY "Public read approved testimonials" ON public.testimonials FOR SELECT USING (is_approved = true);
CREATE POLICY "Students write own testimonials" ON public.testimonials FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins manage testimonials" ON public.testimonials FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

CREATE POLICY "Public read tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admins manage tags" ON public.tags FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

CREATE POLICY "Public read course_tags" ON public.course_tags FOR SELECT USING (true);
CREATE POLICY "Admins manage course_tags" ON public.course_tags FOR ALL USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

COMMIT;
