import crypto from "node:crypto";

// Provider abstraction for payments (see docs/PAYMENT_ARCHITECTURE.md §9/§10).
// Edge Functions are the boundary where this abstraction lives - the frontend
// never imports a provider or sees a provider-specific field name, only calls
// create-order/verify-payment/refund-payment/payment-status by HTTP.

export type PaymentProviderName = "mock" | "razorpay";

export type MockSimulateOutcome =
  | "success"
  | "failure"
  | "cancelled"
  | "expired"
  | "timeout"
  | "verification_failed"
  | "refund_success"
  | "refund_failure";

export interface CreateOrderInput {
  courseId: string;
  userId: string;
  amount: number; // in paise
  currency: string;
  simulate?: MockSimulateOutcome;
}

export interface CreateOrderResult {
  providerOrderId: string;
  amount: number;
  currency: string;
  keyId: string | null;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  reason?: string;
}

export interface RefundInput {
  providerPaymentId: string;
  amount: number; // in paise
  reason: string;
  simulate?: MockSimulateOutcome;
}

export interface RefundResult {
  status: "processed" | "pending" | "failed";
  providerRefundId: string | null;
}

export interface PaymentProvider {
  name: PaymentProviderName;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}

// ─── Mock provider ──────────────────────────────────────────────────────────
// Simulates every outcome documented in PAYMENT_ARCHITECTURE.md §19. Uses the
// same HMAC signature shape Razorpay uses so verify-payment's signature-check
// code path is exercised identically in both modes, not skipped in Mock mode.
export class MockPaymentProvider implements PaymentProvider {
  name: PaymentProviderName = "mock";
  constructor(private readonly secret: string) {}

  computeSignature(providerOrderId: string, providerPaymentId: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest("hex");
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (input.simulate === "timeout") {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (input.simulate === "failure") {
      throw new Error("mock_order_creation_failed");
    }
    return {
      providerOrderId: `mock_order_${crypto.randomUUID()}`,
      amount: input.amount,
      currency: input.currency,
      keyId: null,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const expected = this.computeSignature(input.providerOrderId, input.providerPaymentId);
    if (input.signature !== expected) {
      return { verified: false, reason: "invalid_signature" };
    }
    return { verified: true };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (input.simulate === "refund_failure") {
      return { status: "failed", providerRefundId: null };
    }
    return { status: "processed", providerRefundId: `mock_refund_${crypto.randomUUID()}` };
  }

  /**
   * Mock-only escape hatch: there is no real checkout widget in Mock mode, so the
   * frontend has no legitimate way to produce a valid signature itself (the HMAC
   * secret never leaves the server). This generates a fake-but-correctly-signed
   * "completed checkout" pair, standing in for what a real Razorpay Checkout.js
   * success callback would hand back.
   */
  simulateCheckout(providerOrderId: string): { providerPaymentId: string; signature: string } {
    const providerPaymentId = `mock_pay_${crypto.randomUUID()}`;
    return { providerPaymentId, signature: this.computeSignature(providerOrderId, providerPaymentId) };
  }
}

// ─── Razorpay provider ──────────────────────────────────────────────────────
// Real calls. Cannot be exercised end-to-end until real credentials exist
// (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET - see docs/PAYMENT_ARCHITECTURE.md §11).
export class RazorpayProvider implements PaymentProvider {
  name: PaymentProviderName = "razorpay";
  constructor(private readonly keyId: string, private readonly keySecret: string) {}

  private authHeader(): string {
    return `Basic ${btoa(`${this.keyId}:${this.keySecret}`)}`;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: this.authHeader() },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        receipt: input.courseId,
        notes: { course_id: input.courseId, user_id: input.userId },
      }),
    });
    if (!res.ok) {
      throw new Error(`Razorpay order creation failed: ${await res.text()}`);
    }
    const data = await res.json();
    return { providerOrderId: data.id, amount: data.amount, currency: data.currency, keyId: this.keyId };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const text = `${input.providerOrderId}|${input.providerPaymentId}`;
    const expected = crypto.createHmac("sha256", this.keySecret).update(text).digest("hex");
    if (expected !== input.signature) {
      return { verified: false, reason: "invalid_signature" };
    }
    return { verified: true };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${input.providerPaymentId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: this.authHeader() },
      body: JSON.stringify({ amount: input.amount }),
    });
    if (!res.ok) {
      return { status: "failed", providerRefundId: null };
    }
    const data = await res.json();
    return { status: data.status === "processed" ? "processed" : "pending", providerRefundId: data.id };
  }
}

/** Resolves the active provider from the PAYMENT_PROVIDER env var. Single switch point. */
export function getPaymentProvider(): PaymentProvider {
  const providerName = (Deno.env.get("PAYMENT_PROVIDER") ?? "mock") as PaymentProviderName;

  if (providerName === "razorpay") {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      throw new Error("RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are not configured");
    }
    return new RazorpayProvider(keyId, keySecret);
  }

  const mockSecret = Deno.env.get("MOCK_PAYMENT_SECRET") ?? "dev-mock-secret";
  return new MockPaymentProvider(mockSecret);
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mock-signature, x-razorpay-signature",
  "Content-Type": "application/json",
};

export const createResponse = (
  success: boolean,
  message: string,
  data: unknown = null,
  errors: unknown[] = [],
  status: number = 200,
  requestId: string = crypto.randomUUID()
) => {
  return new Response(
    JSON.stringify({
      success,
      message,
      data,
      errors,
      meta: { requestId, timestamp: new Date().toISOString(), version: "v1" },
    }),
    { status, headers: corsHeaders }
  );
};
