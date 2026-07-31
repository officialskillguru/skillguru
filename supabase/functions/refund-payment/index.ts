import { createClient } from "@supabase/supabase-js";
import { getPaymentProvider, createResponse, corsHeaders, type MockSimulateOutcome } from "./_provider.ts";

interface RefundPaymentRequest {
  orderId: string;
  amount?: number; // rupees, optional -> full refund
  reason: string;
  simulate?: MockSimulateOutcome;
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

    const { data: roles, error: roleError } = await callerClient.rpc("get_current_roles");
    if (roleError || !roles || (!roles.includes("admin") && !roles.includes("super_admin"))) {
      return createResponse(false, "Forbidden. Admin access required.", null, [roleError?.message], 403, requestId);
    }
    const adminId = userResp.user.id;

    const body = (await req.json()) as RefundPaymentRequest;
    const { orderId, amount, reason, simulate } = body;
    if (!orderId || !reason) {
      return createResponse(false, "Validation failed", null, ["orderId and reason are required"], 400, requestId);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("id, user_id, total_amount, status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError || !order) {
      return createResponse(false, "Order not found", null, [orderError?.message], 404, requestId);
    }
    if (order.status !== "completed") {
      return createResponse(false, `Only completed orders can be refunded (current status: ${order.status})`, null, [], 400, requestId);
    }

    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .select("id, razorpay_payment_id, amount")
      .eq("order_id", orderId)
      .eq("status", "completed")
      .maybeSingle();
    if (paymentError || !payment || !payment.razorpay_payment_id) {
      return createResponse(false, "No completed payment with a provider reference found for this order", null, [paymentError?.message], 404, requestId);
    }

    const refundAmountRupees = amount ?? Number(payment.amount);
    const refundAmountPaise = Math.round(refundAmountRupees * 100);
    if (refundAmountRupees <= 0 || refundAmountRupees > Number(payment.amount)) {
      return createResponse(false, "Refund amount must be greater than 0 and cannot exceed the paid amount", null, [], 400, requestId);
    }

    const { data: refundRow, error: refundInsertError } = await serviceClient
      .from("refunds")
      .insert({
        payment_id: payment.id,
        order_id: orderId,
        amount: refundAmountRupees,
        reason,
        status: "processing",
        initiated_by: adminId,
      })
      .select("id")
      .single();
    if (refundInsertError || !refundRow) {
      throw new Error(refundInsertError?.message || "Failed to create refund record");
    }

    const provider = getPaymentProvider();
    const refundResult = await provider.refund({
      providerPaymentId: payment.razorpay_payment_id,
      amount: refundAmountPaise,
      reason,
      simulate,
    });

    await serviceClient
      .from("refunds")
      .update({
        status: refundResult.status,
        razorpay_refund_id: refundResult.providerRefundId,
        processed_at: refundResult.status === "processed" ? new Date().toISOString() : null,
      })
      .eq("id", refundRow.id);

    await serviceClient.from("payment_logs").insert({
      order_id: orderId,
      payment_id: payment.id,
      event: refundResult.status === "processed" ? "refund.processed" : refundResult.status === "failed" ? "refund.failed" : "refund.pending",
      payload: { refundId: refundRow.id, amount: refundAmountRupees },
    });

    if (refundResult.status === "processed") {
      await serviceClient.from("payments").update({ status: "refunded" }).eq("id", payment.id);
      await serviceClient.from("orders").update({ status: "refunded" }).eq("id", orderId);

      const { data: orderItems } = await serviceClient.from("order_items").select("course_id").eq("order_id", orderId);
      const courseIds = (orderItems ?? []).map((i: { course_id: string }) => i.course_id);
      if (courseIds.length > 0) {
        await serviceClient
          .from("enrollments")
          .update({ status: "cancelled" })
          .eq("student_id", order.user_id)
          .in("course_id", courseIds);
      }
    }

    return createResponse(true, "Refund processed", { refundId: refundRow.id, status: refundResult.status }, [], 200, requestId);
  } catch (error) {
    console.error("Error in refund-payment function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});
