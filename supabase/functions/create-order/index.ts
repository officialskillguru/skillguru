import { createClient } from "@supabase/supabase-js";
import { getPaymentProvider, createResponse, corsHeaders, MockPaymentProvider, type MockSimulateOutcome } from "./_provider.ts";

interface CreateOrderRequest {
  courseId: string;
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
    const studentId = userResp.user.id;

    const payload = (await req.json()) as CreateOrderRequest;
    const { courseId, simulate } = payload;
    if (!courseId || typeof courseId !== "string") {
      return createResponse(false, "Validation failed", null, ["courseId is required"], 400, requestId);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: course, error: courseError } = await serviceClient
      .from("courses")
      .select("id, price, status, title")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return createResponse(false, "Course not found", null, [courseError?.message], 404, requestId);
    }
    if (course.status !== "published") {
      return createResponse(false, "Course is not available for enrollment", null, [], 400, requestId);
    }
    const priceNumber = course.price !== null ? Number(course.price) : 0;
    if (priceNumber <= 0) {
      return createResponse(false, "This course is free. Use the enroll-free endpoint instead.", null, [], 400, requestId);
    }

    const amountInPaise = Math.round(priceNumber * 100);

    // 1. Create the order row up front (pending) so a provider-side failure still leaves a traceable row.
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .insert({ user_id: studentId, total_amount: priceNumber, currency: "INR", status: "pending" })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Failed to create order");
    }

    await serviceClient.from("order_items").insert({ order_id: order.id, course_id: courseId, price: priceNumber });
    await serviceClient.from("payment_logs").insert({ order_id: order.id, event: "order.created", payload: { courseId, amountInPaise } });

    // 2. Delegate to the active provider (Mock or Razorpay - resolved once, here).
    const provider = getPaymentProvider();
    try {
      const providerResult = await provider.createOrder({
        courseId,
        userId: studentId,
        amount: amountInPaise,
        currency: "INR",
        simulate,
      });

      await serviceClient
        .from("orders")
        .update({ razorpay_order_id: providerResult.providerOrderId })
        .eq("id", order.id);
      await serviceClient.from("payment_logs").insert({ order_id: order.id, event: "provider.order_created", payload: { provider: provider.name } });

      // Mock mode has no real checkout widget - hand back a pre-signed simulated
      // "completed checkout" the frontend can immediately verify against, standing
      // in for what Razorpay Checkout.js's success callback would provide.
      const mockPayment =
        provider instanceof MockPaymentProvider
          ? provider.simulateCheckout(providerResult.providerOrderId)
          : undefined;

      return createResponse(true, "Order created", {
        orderId: order.id,
        providerOrderId: providerResult.providerOrderId,
        amount: providerResult.amount,
        currency: providerResult.currency,
        provider: provider.name,
        keyId: providerResult.keyId,
        mockPayment,
      }, [], 201, requestId);
    } catch (providerError) {
      const reason = providerError instanceof Error ? providerError.message : "provider_error";
      await serviceClient.from("orders").update({ status: "failed", failure_reason: reason }).eq("id", order.id);
      await serviceClient.from("payment_logs").insert({ order_id: order.id, event: "order.failed", error: reason });
      return createResponse(false, "Failed to create order with payment provider", null, [reason], 502, requestId);
    }
  } catch (error) {
    console.error("Error in create-order function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});
