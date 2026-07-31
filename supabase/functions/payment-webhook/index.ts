import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { corsHeaders } from "./_provider.ts";

// Async confirmation path (docs/PAYMENT_ARCHITECTURE.md §14.2). Authenticated via an
// HMAC signature over the raw request body, never a user JWT - this is called by the
// provider (Razorpay) or the Mock provider's own webhook dispatcher, not a browser.
// The raw payload is always logged to `webhooks` BEFORE any processing, so a payload
// that fails mid-processing still leaves a trace (docs §16 "webhooks" table).

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    const razorpaySignature = req.headers.get("x-razorpay-signature");
    const mockSignature = req.headers.get("x-mock-signature");
    const bodyText = await req.text();

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    let provider: "razorpay" | "mock";
    let secret: string | undefined;
    let signature: string;

    if (razorpaySignature) {
      provider = "razorpay";
      signature = razorpaySignature;
      secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    } else if (mockSignature) {
      provider = "mock";
      signature = mockSignature;
      secret = Deno.env.get("MOCK_PAYMENT_SECRET") ?? "dev-mock-secret";
    } else {
      return jsonResponse({ success: false, error: "Missing webhook signature." }, 401);
    }

    if (!secret) {
      return jsonResponse({ success: false, error: "Webhook secret is not configured." }, 401);
    }

    const expectedSignature = crypto.createHmac("sha256", secret).update(bodyText).digest("hex");
    if (expectedSignature !== signature) {
      return jsonResponse({ success: false, error: "Invalid webhook signature." }, 401);
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event as string;

    // Log first, process second - a bad payload always leaves a trace.
    const { data: webhookRow } = await serviceClient
      .from("webhooks")
      .insert({ provider, event_type: event, payload, processed: false })
      .select("id")
      .single();

    try {
      if (event === "order.paid" || event === "payment.captured") {
        const paymentEntity = payload.payload.payment.entity;
        const providerOrderId = paymentEntity.order_id as string;

        const { data: order } = await serviceClient
          .from("orders")
          .select("id, user_id, status")
          .eq("razorpay_order_id", providerOrderId)
          .maybeSingle();

        if (!order) {
          await markProcessed(serviceClient, webhookRow?.id, "Order not found for provider order id");
          return jsonResponse({ success: true, message: "Ignored - order not found" }, 200);
        }

        // Idempotent: a completed order is a no-op, not an error, no matter how many times the webhook redelivers.
        if (order.status === "completed") {
          await markProcessed(serviceClient, webhookRow?.id, null);
          return jsonResponse({ success: true, message: "Already completed" }, 200);
        }

        const { data: payment } = await serviceClient
          .from("payments")
          .insert({
            order_id: order.id,
            amount: paymentEntity.amount / 100,
            provider,
            provider_id: paymentEntity.id,
            razorpay_payment_id: paymentEntity.id,
            status: "completed",
          })
          .select("id")
          .single();

        await serviceClient.from("orders").update({ status: "completed" }).eq("id", order.id);

        const { data: orderItems } = await serviceClient.from("order_items").select("course_id").eq("order_id", order.id);
        for (const item of orderItems ?? []) {
          const { data: existing } = await serviceClient
            .from("enrollments")
            .select("id")
            .eq("student_id", order.user_id)
            .eq("course_id", item.course_id)
            .maybeSingle();
          if (!existing) {
            await serviceClient
              .from("enrollments")
              .insert({ student_id: order.user_id, course_id: item.course_id, enrollment_source: "purchase", status: "active" });
          }
        }

        const invoiceNumber = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        await serviceClient.from("invoices").insert({ order_id: order.id, invoice_number: invoiceNumber });

        await serviceClient.from("notifications").insert({
          recipient_id: order.user_id,
          title: "Payment successful",
          message: `Your payment for order ${order.id.slice(0, 8)} was successful. You can now access your course.`,
          type: "payment",
          is_read: false,
          metadata: { category: "payment", orderId: order.id },
        });

        await serviceClient
          .from("payment_logs")
          .insert({ order_id: order.id, payment_id: payment?.id, event: "webhook.order_completed" });
      } else if (event === "payment.failed") {
        const paymentEntity = payload.payload.payment.entity;
        const providerOrderId = paymentEntity.order_id as string;
        const { data: order } = await serviceClient
          .from("orders")
          .select("id")
          .eq("razorpay_order_id", providerOrderId)
          .maybeSingle();
        if (order) {
          await serviceClient.from("orders").update({ status: "failed", failure_reason: paymentEntity.error_description ?? null }).eq("id", order.id);
          await serviceClient.from("payments").insert({
            order_id: order.id,
            amount: paymentEntity.amount / 100,
            provider,
            provider_id: paymentEntity.id,
            status: "failed",
            failure_reason: paymentEntity.error_description ?? null,
          });
          await serviceClient.from("payment_logs").insert({ order_id: order.id, event: "webhook.payment_failed" });
        }
      } else if (event === "refund.processed" || event === "refund.failed") {
        const refundEntity = payload.payload.refund.entity;
        const { data: refund } = await serviceClient
          .from("refunds")
          .select("id, order_id, payment_id")
          .eq("razorpay_refund_id", refundEntity.id)
          .maybeSingle();
        if (refund) {
          const newStatus = event === "refund.processed" ? "processed" : "failed";
          await serviceClient
            .from("refunds")
            .update({ status: newStatus, processed_at: newStatus === "processed" ? new Date().toISOString() : null })
            .eq("id", refund.id);
          if (newStatus === "processed") {
            await serviceClient.from("payments").update({ status: "refunded" }).eq("id", refund.payment_id);
            await serviceClient.from("orders").update({ status: "refunded" }).eq("id", refund.order_id);
          }
          await serviceClient.from("payment_logs").insert({ order_id: refund.order_id, event: `webhook.${newStatus === "processed" ? "refund_processed" : "refund_failed"}` });
        }
      }

      await markProcessed(serviceClient, webhookRow?.id, null);
      return jsonResponse({ success: true }, 200);
    } catch (processingError) {
      await markProcessed(serviceClient, webhookRow?.id, (processingError as Error).message);
      throw processingError;
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    return jsonResponse({ success: false, error: (error as Error).message || "Internal Server Error" }, 500);
  }
});

async function markProcessed(
  client: ReturnType<typeof createClient>,
  webhookId: string | undefined,
  error: string | null
) {
  if (!webhookId) return;
  await client.from("webhooks").update({ processed: true, processed_at: new Date().toISOString(), error }).eq("id", webhookId);
}
