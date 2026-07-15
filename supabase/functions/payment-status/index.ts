import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
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

    const url = new URL(request.url);
    const orderId = url.searchParams.get("order_id");

    if (!orderId) {
      return jsonResponse({ error: "Missing order_id." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error } = await supabase.from("orders").select("id, status, user_id").eq("id", orderId).single();

    if (error || !order) {
      return jsonResponse({ error: "Order not found." }, 404);
    }

    // Only allow user to view their own order unless admin (for simplicity, only user)
    if (order.user_id !== user.id) {
      // Check if admin
      const { data: roles } = await callerClient.rpc("current_user_roles");
      if (!roles || (!roles.includes("super_admin") && !roles.includes("admin"))) {
        return jsonResponse({ error: "Forbidden." }, 403);
      }
    }

    return jsonResponse({ status: order.status }, 200);

  } catch (error: any) {
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
