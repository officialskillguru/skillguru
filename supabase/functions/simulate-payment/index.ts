import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { getPaymentProvider, createResponse, corsHeaders } from "./_provider.ts";

// MOCK-PROVIDER-ONLY payment gateway simulator for demos and local testing.
//
// Razorpay reports a decline or a "still processing" UPI/net-banking payment
// through its Checkout.js callbacks and the payment.failed / payment.captured
// webhooks. Mock mode has no gateway, so this function stands in for it:
//   declined -> fail_paid_order()            (what payment.failed does)
//   pending  -> mark_order_payment_pending() (gateway accepted, bank pending)
//   confirm  -> complete_paid_order()        (what a late payment.captured
//                                             webhook does for a pending one)
// It refuses to run unless PAYMENT_PROVIDER resolves to "mock", so it can
// never be used to fake an outcome against a real provider. It only ever acts
// on the caller's own order.

type Outcome = "declined" | "pending" | "confirm";
const OUTCOMES: Outcome[] = ["declined", "pending", "confirm"];

interface SimulateRequest {
  orderId: string;
  outcome: Outcome;
  method?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const requestId = crypto.randomUUID();

  try {
    const provider = getPaymentProvider();
    if (provider.name !== "mock") {
      return createResponse(false, "Not available", null, [], 404, requestId);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing Supabase configuration");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return createResponse(false, "Unauthorized", null, ["Missing authorization header"], 401, requestId);
    }
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userResp, error: userError } = await callerClient.auth.getUser();
    if (userError || !userResp.user) {
      return createResponse(false, "Unauthorized", null, [userError?.message], 401, requestId);
    }

    const body = (await req.json()) as SimulateRequest;
    if (!body.orderId || !OUTCOMES.includes(body.outcome)) {
      return createResponse(false, "Validation failed", null, ["orderId and a valid outcome are required"], 400, requestId);
    }
    const method = typeof body.method === "string" ? body.method.slice(0, 32) : null;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: order } = await serviceClient
      .from("orders")
      .select("id, user_id, status")
      .eq("id", body.orderId)
      .maybeSingle();
    if (!order) {
      return createResponse(false, "Order not found", null, [], 404, requestId);
    }
    if (order.user_id !== userResp.user.id) {
      return createResponse(false, "Unauthorized access to order", null, [], 403, requestId);
    }

    if (body.outcome === "declined") {
      const { data, error } = await serviceClient.rpc("fail_paid_order", {
        p_order_id: order.id,
        p_provider: "mock",
        p_provider_payment_id: `mock_pay_${crypto.randomUUID()}`,
        p_reason: "Declined by the issuing bank (simulated)",
        p_code: "PAYMENT_DECLINED",
        p_method: method,
      });
      if (error) throw new Error(error.message);
      return createResponse(true, "Payment declined", data, [], 200, requestId);
    }

    if (body.outcome === "pending") {
      const providerPaymentId = `mock_pay_${crypto.randomUUID()}`;
      const { data, error } = await serviceClient.rpc("mark_order_payment_pending", {
        p_order_id: order.id,
        p_provider: "mock",
        p_provider_payment_id: providerPaymentId,
        p_method: method,
      });
      if (error) throw new Error(error.message);
      return createResponse(true, "Payment pending confirmation", { ...(data as object), providerPaymentId }, [], 200, requestId);
    }

    // confirm: the bank callback for the latest pending attempt on this order.
    const { data: pendingPayment } = await serviceClient
      .from("payments")
      .select("razorpay_payment_id, method")
      .eq("order_id", order.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const providerPaymentId = pendingPayment?.razorpay_payment_id ?? `mock_pay_${crypto.randomUUID()}`;
    const { data, error } = await serviceClient.rpc("complete_paid_order", {
      p_order_id: order.id,
      p_provider: "mock",
      p_provider_payment_id: providerPaymentId,
      p_signature: null,
      p_method: pendingPayment?.method ?? method,
      p_source: "webhook_simulated",
    });
    if (error) {
      if (error.message.startsWith("order_not_pending")) {
        return createResponse(false, "Order is no longer payable", null, [error.message], 409, requestId);
      }
      throw new Error(error.message);
    }
    return createResponse(true, "Payment confirmed by bank callback", data, [], 200, requestId);
  } catch (error) {
    console.error("Error in simulate-payment function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});
