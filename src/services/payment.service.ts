import { getExtendedSupabaseClient } from "./_shared";
import { type Result, ok, fail, DatabaseError } from "@/utils/result";

// Provider-agnostic payment service. The frontend only ever calls the
// create-order/verify-payment/refund-payment Edge Functions - it never imports
// a provider or sees a provider-specific field name (docs/PAYMENT_ARCHITECTURE.md
// §9/§10). Switching Mock -> Razorpay is a server-side env var change only; this
// file's public shape does not change when that happens.

export interface CheckoutSession {
  orderId: string;
  providerOrderId: string;
  amount: number; // in paise
  currency: string;
  provider: "mock" | "razorpay";
  keyId: string | null;
  /** Only present in Mock mode - there is no real checkout widget to complete against. */
  mockPayment?: { providerPaymentId: string; signature: string };
}

export interface PaymentVerificationResult {
  success: boolean;
  orderId: string;
  enrollmentIds: string[];
  invoiceNumber?: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  close(): void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

let scriptLoaded = false;
async function loadRazorpayScript(): Promise<void> {
  if (scriptLoaded || window.Razorpay) {
    scriptLoaded = true;
    return;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.head.appendChild(script);
  });
}

export const paymentService = {
  async createOrder(courseId: string): Promise<Result<CheckoutSession>> {
    const supabase = getExtendedSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
    const { data, error } = await supabase.functions.invoke<{ success: boolean; message: string; data: CheckoutSession }>("create-order", {
      body: { courseId },
    });
    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- see above
      return fail(new DatabaseError(error.message, "create_order_failed"));
    }
    if (!data?.success || !data.data) {
      return fail(new DatabaseError(data?.message ?? "Failed to create order", "create_order_failed"));
    }
    return ok(data.data);
  },

  /**
   * Opens the real Razorpay checkout widget. Only relevant when the active
   * provider is razorpay - Mock mode never calls this (see verifyAndComplete).
   */
  async openCheckout(
    session: CheckoutSession,
    userInfo: { name?: string; email?: string; phone?: string },
    onSuccess: (paymentId: string, orderId: string, signature: string) => void,
    onDismiss?: () => void
  ): Promise<void> {
    await loadRazorpayScript();
    if (!session.keyId) {
      throw new Error("Payment configuration missing. Please contact support.");
    }

    const options: RazorpayOptions = {
      key: session.keyId,
      amount: session.amount,
      currency: session.currency,
      name: "SkillGuru",
      description: "Course enrollment",
      order_id: session.providerOrderId,
      prefill: { name: userInfo.name ?? "", email: userInfo.email ?? "", contact: userInfo.phone ?? "" },
      theme: { color: "#6366F1" },
      handler: (response: RazorpayResponse) => {
        onSuccess(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
      },
      modal: { ondismiss: onDismiss },
    };

    new window.Razorpay(options).open();
  },

  async verifyPayment(
    orderId: string,
    providerOrderId: string,
    providerPaymentId: string,
    signature: string
  ): Promise<Result<PaymentVerificationResult>> {
    const supabase = getExtendedSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
    const { data, error } = await supabase.functions.invoke<{
      success: boolean;
      message: string;
      data: { orderId: string; enrollmentIds: string[]; invoiceNumber?: string };
    }>("verify-payment", {
      body: { orderId, providerOrderId, providerPaymentId, signature },
    });
    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- see above
      return fail(new DatabaseError(error.message, "verify_payment_failed"));
    }
    if (!data?.success || !data.data) {
      return fail(new DatabaseError(data?.message ?? "Payment verification failed", "verify_payment_failed"));
    }
    return ok({ success: true, orderId: data.data.orderId, enrollmentIds: data.data.enrollmentIds, invoiceNumber: data.data.invoiceNumber });
  },

  async initiateRefund(orderId: string, amountInPaise: number, reason: string): Promise<Result<{ refundId: string; status: string }>> {
    const supabase = getExtendedSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
    const { data, error } = await supabase.functions.invoke<{
      success: boolean;
      message: string;
      data: { refundId: string; status: string };
    }>("refund-payment", {
      body: { orderId, amount: amountInPaise / 100, reason },
    });
    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- see above
      return fail(new DatabaseError(error.message, "refund_failed"));
    }
    if (!data?.success || !data.data) {
      return fail(new DatabaseError(data?.message ?? "Refund failed", "refund_failed"));
    }
    return ok(data.data);
  },

  async getAdminPayments(page = 1, pageSize = 20, search?: string): Promise<Result<{
    data: Record<string, unknown>[];
    count: number;
  }>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("payments")
        .select(`
          *,
          order:orders(
            id, total_amount, status, currency, razorpay_order_id,
            user:profiles(full_name, email)
          ),
          refunds(id, amount, status, razorpay_refund_id)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (search) {
        query = query.or(`razorpay_payment_id.ilike.%${search}%,status.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok({ data: (data as Record<string, unknown>[]) ?? [], count: count ?? 0 });
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "admin_payments"));
    }
  },

  async getRevenueMetrics(): Promise<Result<{
    totalRevenue: number;
    thisMonthRevenue: number;
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    totalRefunds: number;
  }>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [{ data: payments }, { data: monthPayments }, { data: refunds }] = await Promise.all([
        supabase.from("payments").select("amount, status"),
        supabase.from("payments").select("amount").eq("status", "completed").gte("created_at", startOfMonth.toISOString()),
        supabase.from("refunds").select("amount").eq("status", "processed"),
      ]);

      const allPayments = payments ?? [];
      const totalRevenue = allPayments
        .filter((p: { amount: number; status: string }) => p.status === "completed")
        .reduce((sum: number, p: { amount: number; status: string }) => sum + Number(p.amount), 0);

      const thisMonthRevenue = (monthPayments ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
      const totalRefunds = (refunds ?? []).reduce((sum: number, r: { amount: number }) => sum + Number(r.amount), 0);

      return ok({
        totalRevenue,
        thisMonthRevenue,
        totalPayments: allPayments.length,
        successfulPayments: allPayments.filter((p: { amount: number; status: string }) => p.status === "completed").length,
        failedPayments: allPayments.filter((p: { amount: number; status: string }) => p.status === "failed").length,
        totalRefunds,
      });
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "revenue_metrics"));
    }
  },
};
