import { createClient } from "@supabase/supabase-js";
import { createResponse, corsHeaders } from "./_provider.ts";

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

    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id");
    if (!orderId) {
      return createResponse(false, "Validation failed", null, ["order_id is required"], 400, requestId);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error } = await serviceClient
      .from("orders")
      .select("id, status, user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return createResponse(false, "Order not found", null, [error?.message], 404, requestId);
    }

    if (order.user_id !== userResp.user.id) {
      const { data: roles } = await callerClient.rpc("get_current_roles");
      if (!roles || (!roles.includes("admin") && !roles.includes("super_admin"))) {
        return createResponse(false, "Forbidden", null, [], 403, requestId);
      }
    }

    return createResponse(true, "OK", { orderId: order.id, status: order.status }, [], 200, requestId);
  } catch (error) {
    console.error("Error in payment-status function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});
