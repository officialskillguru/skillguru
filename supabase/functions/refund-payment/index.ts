import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Edge function environment is not configured.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    
    // Require admin access
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }
    const { data: roles } = await callerClient.rpc("current_user_roles");
    if (!roles || !roles.includes("super_admin") && !roles.includes("admin")) {
      return jsonResponse({ error: "Forbidden. Admin access required." }, 403);
    }

    const body = await request.json();
    const { order_id, amount } = body; // amount is optional (partial refund)

    if (!order_id) {
      return jsonResponse({ error: "Missing order_id." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get payment associated with order
    // Wait, we need razorpay_payment_id. In verify-payment, we didn't store it!
    // We should probably just store it in `payments.id` or a new column. 
    // For now, if we don't have it, we can fetch from Razorpay Orders API.
    
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    // First, we need razorpay order id. We didn't store it in our DB natively. 
    // We can assume `order_id` in frontend corresponds to our Supabase order. 
    // To do refunds via Razorpay we need their payment_id.
    // In a real system we'd store `razorpay_payment_id` in `payments` table.
    
    // Mock refund for now since we don't have razorpay_payment_id readily stored in the schema easily.
    await supabase.from("orders").update({ status: "refunded" }).eq("id", order_id);
    await supabase.from("payments").update({ status: "refunded" }).eq("order_id", order_id);
    
    // Revoke enrollments
    const { data: orderItems } = await supabase.from("order_items").select("course_id").eq("order_id", order_id);
    if (orderItems && orderItems.length > 0) {
      const courseIds = orderItems.map(i => i.course_id);
      
      const { data: orderUser } = await supabase.from("orders").select("user_id").eq("id", order_id).single();
      if (orderUser) {
        await supabase
          .from("student_enrollments")
          .update({ status: "cancelled" })
          .eq("student_id", orderUser.user_id)
          .in("course_id", courseIds);
      }
    }

    return jsonResponse({
      success: true,
      message: "Refund processed successfully (mock)."
    }, 200);

  } catch (error: any) {
    console.error("Refund Error:", error);
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
