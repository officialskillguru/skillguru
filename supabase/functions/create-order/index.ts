import { createClient } from "@supabase/supabase-js";
import { getPaymentProvider, createResponse, corsHeaders, MockPaymentProvider, type MockSimulateOutcome } from "./_provider.ts";

interface CheckoutBilling {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
}

interface CreateOrderRequest {
  courseId: string;
  simulate?: MockSimulateOutcome;
  billing?: CheckoutBilling;
}

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Server-side re-validation of the checkout form (the browser validates too). */
function validateBilling(billing: CheckoutBilling | undefined): { value: Required<CheckoutBilling> | null; errors: string[] } {
  if (!billing) return { value: null, errors: [] };
  const value = {
    fullName: String(billing.fullName ?? "").trim().slice(0, 120),
    email: String(billing.email ?? "").trim().toLowerCase().slice(0, 254),
    phone: String(billing.phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""),
    city: String(billing.city ?? "").trim().slice(0, 80),
  };
  const errors: string[] = [];
  if (value.fullName.length < 2) errors.push("fullName");
  if (!EMAIL_RE.test(value.email)) errors.push("email");
  if (!PHONE_RE.test(value.phone)) errors.push("phone");
  if (value.city.length < 2) errors.push("city");
  return { value, errors };
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
    const billing = validateBilling(payload.billing);
    if (billing.errors.length > 0) {
      return createResponse(false, "Please correct the highlighted checkout details", null, billing.errors, 422, requestId);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: course, error: courseError } = await serviceClient
      .from("courses")
      .select("id, price, discount_price, status, title")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return createResponse(false, "Course not found", null, [courseError?.message], 404, requestId);
    }
    if (course.status !== "published") {
      return createResponse(false, "Course is not available for enrollment", null, [], 400, requestId);
    }
    // Same effective price the course page shows: a valid discount below the list price wins.
    const listPrice = course.price !== null ? Number(course.price) : 0;
    const discount = course.discount_price !== null ? Number(course.discount_price) : null;
    const priceNumber = discount !== null && discount >= 0 && discount < listPrice ? discount : listPrice;
    if (priceNumber <= 0) {
      return createResponse(false, "This course is free. Use the enroll-free endpoint instead.", null, [], 400, requestId);
    }

    const amountInPaise = Math.round(priceNumber * 100);

    const { data: activeEnrollment } = await serviceClient
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("status", "active")
      .maybeSingle();
    if (activeEnrollment) {
      return createResponse(false, "You are already enrolled in this course", null, ["already_enrolled"], 409, requestId);
    }

    const provider = getPaymentProvider();

    // Double-submit guard: a pending order for the same course from the last
    // 30 minutes (same price) is reused instead of opening a second one.
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentPending } = await serviceClient
      .from("orders")
      .select("id, razorpay_order_id, total_amount, order_items!inner(course_id)")
      .eq("user_id", studentId)
      .eq("status", "pending")
      .eq("order_items.course_id", courseId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentPending?.razorpay_order_id && Number(recentPending.total_amount) === priceNumber) {
      if (billing.value) {
        await serviceClient.from("orders").update({ notes: JSON.stringify({ billing: billing.value }) }).eq("id", recentPending.id);
      }
      await serviceClient.from("payment_logs").insert({ order_id: recentPending.id, event: "order.reused", payload: { courseId } });
      return createResponse(true, "Order resumed", {
        orderId: recentPending.id,
        providerOrderId: recentPending.razorpay_order_id,
        amount: amountInPaise,
        currency: "INR",
        provider: provider.name,
        keyId: provider instanceof MockPaymentProvider ? null : Deno.env.get("RAZORPAY_KEY_ID") ?? null,
        mockPayment: provider instanceof MockPaymentProvider ? provider.simulateCheckout(recentPending.razorpay_order_id) : undefined,
        courseTitle: course.title,
        resumed: true,
      }, [], 200, requestId);
    }

    // 1. Create the order row up front (pending) so a provider-side failure still leaves a traceable row.
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .insert({
        user_id: studentId,
        total_amount: priceNumber,
        currency: "INR",
        status: "pending",
        notes: billing.value ? JSON.stringify({ billing: billing.value }) : null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Failed to create order");
    }

    await serviceClient.from("order_items").insert({ order_id: order.id, course_id: courseId, price: priceNumber });
    await serviceClient.from("payment_logs").insert({ order_id: order.id, event: "order.created", payload: { courseId, amountInPaise } });

    // 2. Delegate to the active provider (Mock or Razorpay - resolved once, here).
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
        courseTitle: course.title,
        resumed: false,
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
