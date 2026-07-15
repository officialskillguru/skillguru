import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import crypto from "node:crypto";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      throw new Error("Edge function environment is not configured.");
    }

    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      return jsonResponse({ error: "Missing webhook signature." }, 401);
    }

    const bodyText = await request.text();
    const generatedSignature = crypto.createHmac('sha256', webhookSecret).update(bodyText).digest('hex');

    if (generatedSignature !== signature) {
      return jsonResponse({ error: "Invalid webhook signature." }, 401);
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    console.log("Processing webhook event:", event);

    if (event === "order.paid" || event === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const notes = paymentEntity.notes || {};
      const supabaseOrderId = notes.supabase_order_id;

      if (!supabaseOrderId) {
        console.warn("No supabase_order_id found in notes for order:", razorpayOrderId);
        return jsonResponse({ success: true, message: "Ignored, missing supabase_order_id" }, 200);
      }

      // 1. Check order
      const { data: order } = await supabase.from("orders").select("*").eq("id", supabaseOrderId).single();
      if (!order) return jsonResponse({ error: "Order not found" }, 404);
      if (order.status === "completed") return jsonResponse({ success: true, message: "Already completed" }, 200);

      // 2. Update order
      await supabase.from("orders").update({ status: "completed" }).eq("id", supabaseOrderId);

      // 3. Insert payment
      await supabase.from("payments").insert({
        order_id: supabaseOrderId,
        amount: paymentEntity.amount / 100, // paise to INR
        status: "completed"
      });

      // 4. Enroll student
      const { data: orderItems } = await supabase.from("order_items").select("course_id").eq("order_id", supabaseOrderId);
      if (orderItems && orderItems.length > 0) {
        const enrollments = orderItems.map(item => ({
          student_id: order.user_id,
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
        order_id: supabaseOrderId,
        user_id: order.user_id,
        invoice_number: invoiceNumber,
        amount: order.total_amount,
        status: "paid"
      });
      
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payload.payment.entity;
      const notes = paymentEntity.notes || {};
      const supabaseOrderId = notes.supabase_order_id;
      
      if (supabaseOrderId) {
        await supabase.from("orders").update({ status: "failed" }).eq("id", supabaseOrderId);
        await supabase.from("payments").insert({
          order_id: supabaseOrderId,
          amount: paymentEntity.amount / 100,
          status: "failed"
        });
      }
    } else if (event === "refund.created" || event === "refund.processed") {
      const refundEntity = payload.payload.refund.entity;
      const paymentId = refundEntity.payment_id;
      
      // Need to find the payment to link to order, though webhook might not have notes
      // Let's keep it simple for now and log it, or update payment if we stored razorpay_payment_id
      console.log("Refund processed for payment:", paymentId);
    }

    return jsonResponse({ success: true }, 200);

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
