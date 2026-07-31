import { createClient } from "@supabase/supabase-js";
import { getPaymentProvider, createResponse, corsHeaders } from "./_provider.ts";

interface VerifyPaymentRequest {
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
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
    const { orderId, providerOrderId, providerPaymentId, signature } = body;
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

    // Idempotent: a second call for an already-completed order returns the same result, not an error.
    if (order.status === "completed") {
      const { data: orderItems } = await serviceClient.from("order_items").select("course_id").eq("order_id", orderId);
      const courseIds = (orderItems ?? []).map((i: { course_id: string }) => i.course_id);
      const { data: existingEnrollments } = await serviceClient
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .in("course_id", courseIds);
      return createResponse(true, "Order already completed", {
        orderId,
        enrollmentIds: (existingEnrollments ?? []).map((e: { id: string }) => e.id),
      }, [], 200, requestId);
    }

    if (order.status !== "pending") {
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

    await serviceClient.from("payment_logs").insert({ order_id: orderId, event: "provider.signature_verified" });

    // 1. Record the payment
    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .insert({
        order_id: orderId,
        amount: order.total_amount,
        provider: provider.name,
        provider_id: providerPaymentId,
        razorpay_payment_id: providerPaymentId,
        razorpay_signature: signature,
        status: "completed",
      })
      .select("id")
      .single();
    if (paymentError || !payment) {
      throw new Error(paymentError?.message || "Failed to record payment");
    }

    // 2. Complete the order
    await serviceClient.from("orders").update({ status: "completed" }).eq("id", orderId);

    // 3. Grant enrollment for every course in the order (service-role - enrollments has no
    //    student-facing INSERT policy, see docs/PAYMENT_ARCHITECTURE.md §16 / Phase 1.5 finding).
    const { data: orderItems } = await serviceClient.from("order_items").select("course_id").eq("order_id", orderId);
    const enrollmentIds: string[] = [];
    for (const item of orderItems ?? []) {
      const { data: existing } = await serviceClient
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .eq("course_id", item.course_id)
        .maybeSingle();

      if (existing) {
        enrollmentIds.push(existing.id);
        continue;
      }

      const { data: enrollment, error: enrollError } = await serviceClient
        .from("enrollments")
        .insert({ student_id: studentId, course_id: item.course_id, enrollment_source: "purchase", status: "active" })
        .select("id")
        .single();
      if (enrollError || !enrollment) {
        throw new Error(enrollError?.message || "Failed to create enrollment");
      }
      enrollmentIds.push(enrollment.id);
    }

    // 4. Invoice (only the columns that actually exist on `invoices`)
    const invoiceNumber = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    await serviceClient.from("invoices").insert({ order_id: orderId, invoice_number: invoiceNumber });

    // 5. Notification (real schema: recipient_id/title/message/type, category goes in metadata)
    await serviceClient.from("notifications").insert({
      recipient_id: studentId,
      title: "Payment successful",
      message: `Your payment for order ${orderId.slice(0, 8)} was successful. You can now access your course.`,
      type: "payment",
      is_read: false,
      metadata: { category: "payment", orderId },
    });

    await serviceClient.from("payment_logs").insert({
      order_id: orderId,
      payment_id: payment.id,
      event: "enrollment.created",
      payload: { enrollmentIds, invoiceNumber },
    });

    return createResponse(true, "Payment verified", { orderId, enrollmentIds, invoiceNumber }, [], 200, requestId);
  } catch (error) {
    console.error("Error in verify-payment function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});
