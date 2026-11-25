import { createClient } from "@supabase/supabase-js";
import { getPaymentProvider, createResponse, corsHeaders } from "./_provider.ts";

interface VerifyPaymentRequest {
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  method?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userResp, error: userError } = await callerClient.auth.getUser();
    if (userError || !userResp.user) {
      return createResponse(false, "Unauthorized", null, [userError?.message], 401, requestId);
    }
    const studentId = userResp.user.id;

    const body = (await req.json()) as VerifyPaymentRequest;
    const { orderId, providerOrderId, providerPaymentId, signature, method } = body;
    if (!orderId || !providerOrderId || !providerPaymentId || !signature) {
      return createResponse(false, "Validation failed", null, ["Missing payment parameters"], 400, requestId);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return createResponse(false, "Order not found", null, [orderError?.message], 404, requestId);
    }
    if (order.user_id !== studentId) {
      return createResponse(false, "Unauthorized access to order", null, [], 403, requestId);
    }

    // Fast path for an order that already failed/was cancelled. A completed
    // order still goes through complete_paid_order(), which is idempotent and
    // returns the original enrollment/receipt instead of creating new ones.
    if (order.status !== "pending" && order.status !== "completed") {
      return createResponse(false, `Order is in a terminal state (${order.status}) and cannot be verified`, null, [], 409, requestId);
    }

    const provider = getPaymentProvider();
    const verifyResult = await provider.verifyPayment({ providerOrderId, providerPaymentId, signature });

    if (!verifyResult.verified) {
      await serviceClient.from("payment_logs").insert({
        order_id: orderId,
        event: "provider.signature_invalid",
        error: verifyResult.reason ?? "invalid_signature",
      });
      return createResponse(false, "Invalid payment signature", null, [verifyResult.reason], 400, requestId);
    }
    if (!order.razorpay_order_id || order.razorpay_order_id !== providerOrderId) {
      return createResponse(false, "Payment does not belong to this order", null, [], 400, requestId);
    }

    // Single locked transition (see migration 20261125000001): payment row,
    // order -> completed, enrollment(s), invoice and notification happen
    // exactly once even if verify-payment and the webhook race each other.
    const { data: completion, error: completionError } = await serviceClient.rpc("complete_paid_order", {
      p_order_id: orderId,
      p_provider: provider.name,
      p_provider_payment_id: providerPaymentId,
      p_signature: signature,
      p_method: typeof method === "string" ? method.slice(0, 32) : null,
      p_source: "verify",
    });
    if (completionError || !completion) {
      const message = completionError?.message ?? "Failed to complete order";
      if (message.startsWith("order_not_pending")) {
        return createResponse(false, "Order is no longer payable", null, [message], 409, requestId);
      }
      throw new Error(message);
    }

    const result = completion as { orderId: string; enrollmentIds: string[]; invoiceNumber: string | null; alreadyCompleted: boolean };
    return createResponse(
      true,
      result.alreadyCompleted ? "Order already completed" : "Payment verified",
      result,
      [],
      200,
      requestId,
    );
  } catch (error) {
    console.error("Error in verify-payment function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});
