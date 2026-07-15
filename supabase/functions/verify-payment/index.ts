import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import crypto from "node:crypto";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !razorpayKeySecret) {
      throw new Error("Edge function environment is not configured.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, supabase_order_id } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !supabase_order_id) {
      return jsonResponse({ error: "Missing payment parameters." }, 400);
    }

    // Verify HMAC signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto.createHmac('sha256', razorpayKeySecret).update(text).digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return jsonResponse({ error: "Invalid payment signature." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", supabase_order_id)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found." }, 404);
    }

    if (order.status === "completed") {
      return jsonResponse({ message: "Order is already completed." }, 200);
    }

    if (order.user_id !== user.id) {
      return jsonResponse({ error: "Unauthorized access to order." }, 403);
    }

    // 1. Update order status
    await supabase.from("orders").update({ status: "completed" }).eq("id", supabase_order_id);

    // 2. Insert payment record
    await supabase.from("payments").insert({
      order_id: supabase_order_id,
      amount: order.total_amount,
      status: "completed"
    });

    // 3. Get order items
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("course_id")
      .eq("order_id", supabase_order_id);

    // 4. Enroll student
    if (orderItems && orderItems.length > 0) {
      const enrollments = orderItems.map(item => ({
        student_id: user.id,
        course_id: item.course_id,
        status: "active",
        progress: 0,
        certificate_issued: false
      }));

      await supabase.from("student_enrollments").insert(enrollments);
    }

    // 5. Generate Invoice
    const invoiceNumber = `INV-${new Date().toISOString().slice(2,10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    await supabase.from("invoices").insert({
      order_id: supabase_order_id,
      user_id: user.id,
      invoice_number: invoiceNumber,
      amount: order.total_amount,
      status: "paid"
    });

    // 6. Notify user
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Payment Successful",
      message: `Your payment for order ${supabase_order_id.slice(0, 8)} was successful. You can now access your courses.`,
      type: "payment"
    });

    return jsonResponse({
      success: true,
      order_id: supabase_order_id,
      invoice_number: invoiceNumber
    }, 200);

  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}
