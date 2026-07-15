-- =============================================================================
-- Migration: 008_commerce.sql (Restored)
-- Version:   1.0.0
-- Description:
--   Creates the Commerce domain for SkillGuru.
--   Adds pricing to courses, creates orders and order_items tables,
--   and replaces the has_active_enrollment stub.
-- =============================================================================

BEGIN;

-- 1. Add missing fields to courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration text;

-- 2. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_amount    numeric(10,2) NOT NULL DEFAULT 0,
    status          text NOT NULL DEFAULT 'created',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    price           numeric(10,2) NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_course_id ON public.order_items(course_id);

-- 4. Replace has_active_enrollment stub
CREATE OR REPLACE FUNCTION public.has_active_enrollment(p_course_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE course_id = p_course_id 
        AND student_id = auth.uid() 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL
USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT
USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own order items" ON public.order_items FOR INSERT
WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all order items" ON public.order_items FOR ALL
USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

COMMIT;
