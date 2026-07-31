-- =============================================================================
-- Migration: 20260718000003_payment_enhancements.sql
-- Version:   1.0.0
-- Description:
--   Enhances the commerce domain with production-ready Razorpay integration.
--   Extends: orders, payments tables
--   Creates: refunds, payment_logs, webhooks, transactions view
--
-- Dependencies:
--   20260706000010_commerce.sql (orders, payments, order_items)
--   20260706000011_platform_features.sql (coupon_codes)
-- =============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Extend orders table
-- ============================================================================
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS razorpay_order_id  text UNIQUE,
    ADD COLUMN IF NOT EXISTS coupon_id           uuid REFERENCES public.coupon_codes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS discount_amount     numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency            text NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS notes               text,
    ADD COLUMN IF NOT EXISTS failure_reason      text;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON public.orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;

-- ============================================================================
-- SECTION 2: Extend payments table
-- ============================================================================
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS razorpay_payment_id    text UNIQUE,
    ADD COLUMN IF NOT EXISTS razorpay_signature     text,
    ADD COLUMN IF NOT EXISTS failure_reason         text,
    ADD COLUMN IF NOT EXISTS failure_code           text,
    ADD COLUMN IF NOT EXISTS method                 text, -- 'card','netbanking','upi','wallet'
    ADD COLUMN IF NOT EXISTS bank                   text,
    ADD COLUMN IF NOT EXISTS wallet                 text,
    ADD COLUMN IF NOT EXISTS vpa                    text, -- UPI VPA
    ADD COLUMN IF NOT EXISTS card_last4             text,
    ADD COLUMN IF NOT EXISTS international          boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_payments_razorpay ON public.payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- ============================================================================
-- SECTION 3: Refunds
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.refunds (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id          uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount              numeric(10,2) NOT NULL,
    reason              text NOT NULL,
    status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','processed','failed','cancelled')),
    razorpay_refund_id  text UNIQUE,
    initiated_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    processed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

DROP TRIGGER IF EXISTS set_updated_at ON public.refunds;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.refunds
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own refunds" ON public.refunds FOR SELECT
    USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage refunds" ON public.refunds FOR ALL
    USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

-- ============================================================================
-- SECTION 4: Payment Logs (immutable event log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_id  uuid REFERENCES public.payments(id) ON DELETE CASCADE,
    event       text NOT NULL, -- 'order_created','payment_initiated','payment_success','payment_failed','refund_initiated','webhook_received'
    payload     jsonb DEFAULT '{}'::jsonb,
    error       text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_order ON public.payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created ON public.payment_logs(created_at DESC);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view payment logs" ON public.payment_logs FOR SELECT
    USING (public.has_role('admin'));
CREATE POLICY "System insert payment logs" ON public.payment_logs FOR INSERT
    WITH CHECK (true); -- Via service role

-- ============================================================================
-- SECTION 5: Webhooks (raw webhook event log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webhooks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider    text NOT NULL DEFAULT 'razorpay',
    event_type  text NOT NULL,
    payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
    processed   boolean NOT NULL DEFAULT false,
    error       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON public.webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_webhooks_created ON public.webhooks(created_at DESC);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view webhooks" ON public.webhooks FOR SELECT
    USING (public.has_role('admin'));
CREATE POLICY "System insert webhooks" ON public.webhooks FOR INSERT
    WITH CHECK (true); -- Via service role / Edge Function

-- ============================================================================
-- SECTION 6: Transactions View (unified commerce view)
-- ============================================================================
CREATE OR REPLACE VIEW public.transactions AS
SELECT
    o.id AS order_id,
    o.user_id,
    o.total_amount,
    o.discount_amount,
    o.currency,
    o.status AS order_status,
    o.razorpay_order_id,
    o.created_at AS order_created_at,
    p.id AS payment_id,
    p.amount AS payment_amount,
    p.provider,
    p.razorpay_payment_id,
    p.status AS payment_status,
    p.method,
    p.created_at AS payment_created_at,
    r.id AS refund_id,
    r.amount AS refund_amount,
    r.status AS refund_status,
    r.razorpay_refund_id,
    pr.full_name AS student_name,
    pr.email AS student_email
FROM public.orders o
LEFT JOIN public.payments p ON p.order_id = o.id
LEFT JOIN public.refunds r ON r.order_id = o.id
LEFT JOIN public.profiles pr ON pr.id = o.user_id;

-- ============================================================================
-- SECTION 7: Extend coupon_codes with more fields
-- ============================================================================
ALTER TABLE public.coupon_codes
    ADD COLUMN IF NOT EXISTS discount_type  text NOT NULL DEFAULT 'percentage'
                                            CHECK (discount_type IN ('percentage','fixed')),
    ADD COLUMN IF NOT EXISTS min_order_amount numeric(10,2),
    ADD COLUMN IF NOT EXISTS max_discount_amount numeric(10,2),
    ADD COLUMN IF NOT EXISTS applicable_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_active       boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS description     text;

COMMIT;
