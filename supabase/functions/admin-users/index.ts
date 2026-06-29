import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const adminRoles = new Set(["super_admin", "admin", "editor", "mentor_manager", "course_manager", "crm_manager", "content_manager", "counsellor", "sales"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Supabase function environment is not configured.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: callerRoles, error: roleError } = await callerClient.rpc("current_user_roles");
    if (roleError) {
      throw roleError;
    }

    if (!callerRoles?.includes("super_admin")) {
      return jsonResponse({ error: "Only Super Admin can create admin accounts." }, 403);
    }

    const payload = await request.json();
    const fullName = stringValue(payload.fullName);
    const email = stringValue(payload.email).toLowerCase();
    const password = stringValue(payload.password);
    const role = stringValue(payload.role);

    if (!fullName || !email || password.length < 8 || !adminRoles.has(role)) {
      return jsonResponse({ error: "Invalid admin account payload." }, 400);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "admin",
        status: "active",
        admin_role: role,
      },
      app_metadata: {
        role: "admin",
        roles: [role],
        created_by_super_admin: true,
      },
    });

    if (createError || !created.user) {
      throw createError ?? new Error("Unable to create admin user.");
    }

    const adminAccount = {
      id: created.user.id,
      name: fullName,
      email,
      role,
      status: "active",
    };

    const { data, error } = await serviceClient.from("admin_accounts").upsert(adminAccount).select("*").single();
    if (error) {
      throw error;
    }

    await serviceClient.from("admins").upsert({
      id: created.user.id,
      full_name: fullName,
      email,
      role,
      status: "active",
    });

    await serviceClient.from("profiles").upsert({
      id: created.user.id,
      email,
      role: "admin",
      status: "active",
    });

    const { data: roleRecord } = await serviceClient.from("roles").select("id").eq("name", role).maybeSingle();
    if (roleRecord) {
      await serviceClient.from("user_roles").upsert({ user_id: created.user.id, role_id: roleRecord.id });
    }

    return jsonResponse(data, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create admin account.";
    return jsonResponse({ error: message }, 500);
  }
});

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
