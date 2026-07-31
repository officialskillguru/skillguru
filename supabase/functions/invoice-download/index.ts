import { createClient } from "@supabase/supabase-js";

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
    const invoiceId = url.searchParams.get("id");

    if (!invoiceId) {
      return jsonResponse({ error: "Missing invoice id." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: invoice, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();

    if (error || !invoice) {
      return jsonResponse({ error: "Invoice not found." }, 404);
    }

    // Only allow user to view their own invoice unless admin
    if (invoice.user_id !== user.id) {
      const { data: roles } = await callerClient.rpc("current_user_roles");
      if (!roles || (!roles.includes("super_admin") && !roles.includes("admin"))) {
        return jsonResponse({ error: "Forbidden." }, 403);
      }
    }

    // Dummy PDF generation (in a real app, use pdf-lib or puppeteer)
    // Here we'll just return a data URI for a tiny PDF or text representation
    // Or we could return JSON that the frontend turns into a print view.
    // Let's return JSON containing invoice data. The frontend can render it as a printable page.
    
    const { data: orderItems } = await supabase.from("order_items").select("*, courses(title)").eq("order_id", invoice.order_id);
    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", invoice.user_id).single();

    return jsonResponse({ 
      success: true,
      invoice: {
        ...invoice,
        items: orderItems,
        customer: profile
      }
    }, 200);

  } catch (error: unknown) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
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
