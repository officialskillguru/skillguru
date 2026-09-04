import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type ResponseCode =
  | "OK"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "EMAIL_EXISTS"
  | "AUTH_PROVISION_FAILED"
  | "WORKSPACE_PROVISION_FAILED"
  | "ROLLBACK_FAILED"
  | "INTERNAL_ERROR";

// Mirrors create-student/create-mentor's response shape so all three admin-account
// creation flows are consistent for the frontend.
const createResponse = (
  success: boolean,
  code: ResponseCode,
  message: string,
  data: unknown = null,
  errors: unknown[] = [],
  details: Record<string, unknown> = {},
  status: number = 200,
  requestId: string = crypto.randomUUID()
) => {
  return new Response(
    JSON.stringify({
      success,
      code,
      message,
      data,
      errors,
      details,
      meta: { requestId, timestamp: new Date().toISOString(), version: "v1" },
    }),
    { status, headers: corsHeaders }
  );
};

function log(requestId: string, level: "info" | "error", event: string, extra: Record<string, unknown> = {}) {
  const entry = { requestId, level, event, ...extra, timestamp: new Date().toISOString() };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

async function withRetry<T>(fn: () => Promise<T>, isRetryable: (result: T) => boolean, attempts = 3, backoffMs = 300): Promise<T> {
  let last: T;
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (!isRetryable(last)) return last;
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, backoffMs * (i + 1)));
  }
  return last!;
}

const createCounsellorSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  onboardingMethod: z.enum(["manual"]).default("manual"),
});

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

    // 1. Validate caller (must be admin or super_admin)
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return createResponse(false, "UNAUTHORIZED", "Unauthorized", null, ["Missing authorization header"], {}, 401, requestId);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: userResp, error: userError } = await callerClient.auth.getUser();
    if (userError || !userResp.user) {
      return createResponse(false, "UNAUTHORIZED", "Unauthorized caller", null, [userError?.message], {}, 401, requestId);
    }
    const callerId = userResp.user.id;

    const { data: callerRoles, error: roleError } = await callerClient.rpc("get_current_roles");
    if (roleError) {
      log(requestId, "error", "caller_role_check_failed", { callerId, error: roleError.message });
    }

    if (roleError || !callerRoles || (!callerRoles.includes("admin") && !callerRoles.includes("super_admin"))) {
      return createResponse(false, "FORBIDDEN", "Forbidden", null, ["Only admins can create counsellors"], {}, 403, requestId);
    }

    // 2. Validate payload
    const payload = await req.json();
    const parseResult = createCounsellorSchema.safeParse(payload);

    if (!parseResult.success) {
      return createResponse(false, "VALIDATION_ERROR", "Validation failed", null, parseResult.error.errors, {}, 400, requestId);
    }

    const { fullName, email, password, phone, bio, onboardingMethod } = parseResult.data;
    const normalizedEmail = email.toLowerCase();

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Fast-path duplicate check (best-effort — the real guarantee is the DB's UNIQUE
    // constraint on profiles.email / auth.users.email, checked again via the
    // auth.admin.createUser() error below, so concurrent double-submits are still safe).
    const { data: existingUser } = await serviceClient.from("profiles").select("id").eq("email", normalizedEmail).maybeSingle();
    if (existingUser) {
      log(requestId, "info", "duplicate_email_precheck", { email: normalizedEmail });
      return createResponse(false, "EMAIL_EXISTS", "User already exists", null, ["Email is already registered"], { email: normalizedEmail }, 409, requestId);
    }

    const tempPassword = password || crypto.randomUUID().slice(0, 12) + "A1!";

    // ==========================================
    // SAGA PATTERN START
    // ==========================================
    let createdAuthUserId: string | null = null;

    try {
      const authResult = await withRetry(
        () =>
          serviceClient.auth.admin.createUser({
            email: normalizedEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, role: "counsellor" },
          }),
        (result) => Boolean(result.error) && !/already.*regist/i.test(result.error?.message ?? ""),
        3,
        300
      );

      if (authResult.error || !authResult.data.user) {
        const alreadyExists = /already.*regist/i.test(authResult.error?.message ?? "");
        if (alreadyExists) {
          return createResponse(false, "EMAIL_EXISTS", "User already exists", null, ["Email is already registered"], { email: normalizedEmail }, 409, requestId);
        }
        throw new Error(authResult.error?.message || "Failed to create auth user");
      }

      createdAuthUserId = authResult.data.user.id;
      log(requestId, "info", "auth_user_created", { userId: createdAuthUserId });

      // Profile (upsert: handle_new_user trigger already auto-creates the row the
      // instant the auth user is created — a plain insert throws a unique-violation).
      const { error: profileError } = await serviceClient.from("profiles").upsert(
        { id: createdAuthUserId, email: normalizedEmail, full_name: fullName, phone, bio },
        { onConflict: "id" }
      );
      if (profileError) throw new Error("Profile creation failed: " + profileError.message);

      // Role mapping — Counsellor is its own role, distinct from Mentor/Teacher.
      const { data: roleRecord, error: roleLookupError } = await serviceClient.from("roles").select("id").eq("code", "counsellor").maybeSingle();
      if (roleLookupError) throw new Error("Counsellor role lookup failed: " + roleLookupError.message);
      if (!roleRecord) throw new Error("Counsellor role lookup failed: role code 'counsellor' not found");

      const { error: roleAssignError } = await serviceClient
        .from("user_roles")
        .upsert({ user_id: createdAuthUserId, role_id: roleRecord.id }, { onConflict: "user_id,role_id" });
      if (roleAssignError) throw new Error("Role assignment failed: " + roleAssignError.message);

      // User Settings (force password reset if manual) — upsert: trg_create_user_settings
      // already created a default row for this user the moment the profile was inserted.
      const { error: settingsError } = await serviceClient
        .from("user_settings")
        .upsert(
          { user_id: createdAuthUserId, password_reset_required: onboardingMethod === "manual" },
          { onConflict: "user_id" }
        );
      if (settingsError) throw new Error("User Settings creation failed: " + settingsError.message);

      const { error: statsError } = await serviceClient
        .from("user_statistics")
        .upsert({ user_id: createdAuthUserId }, { onConflict: "user_id" });
      if (statsError) throw new Error("User Statistics creation failed: " + statsError.message);

      const { error: auditError } = await serviceClient.from("audit_logs").insert({
        actor_id: callerId,
        target_id: createdAuthUserId,
        action: "counsellor_created",
        entity_type: "counsellor",
        entity_id: createdAuthUserId,
        request_id: requestId,
      });
      if (auditError) log(requestId, "error", "audit_log_failed", { userId: createdAuthUserId, error: auditError.message });

      // ==========================================
      // SAGA SUCCESS
      // ==========================================
      log(requestId, "info", "counsellor_provisioned", { userId: createdAuthUserId, onboardingMethod });

      return createResponse(
        true,
        "OK",
        "Counsellor account provisioned successfully",
        { id: createdAuthUserId, email: normalizedEmail, fullName, onboardingMethod, temporaryPassword: tempPassword },
        [],
        {},
        201,
        requestId
      );
    } catch (sagaError) {
      // ==========================================
      // SAGA ROLLBACK (Compensating Transaction)
      // ==========================================
      const sagaMessage = sagaError instanceof Error ? sagaError.message : String(sagaError);
      log(requestId, "error", "saga_failed", { userId: createdAuthUserId, error: sagaMessage });

      if (createdAuthUserId) {
        // Delete cascades to profiles/user_roles/user_settings/user_statistics via
        // ON DELETE CASCADE FKs — but only if this call actually succeeds, so its
        // result is checked and retried instead of being assumed to have worked.
        const deleteResult = await withRetry(
          () => serviceClient.auth.admin.deleteUser(createdAuthUserId as string),
          (result) => Boolean(result.error),
          3,
          300
        );

        if (deleteResult.error) {
          log(requestId, "error", "rollback_failed", { userId: createdAuthUserId, error: deleteResult.error.message });
          return createResponse(
            false,
            "ROLLBACK_FAILED",
            "Counsellor provisioning failed and automatic cleanup also failed. This account requires manual review.",
            null,
            [sagaMessage, deleteResult.error.message],
            { userId: createdAuthUserId, requiresManualCleanup: true },
            500,
            requestId
          );
        }

        log(requestId, "info", "rollback_succeeded", { userId: createdAuthUserId });
      }

      return createResponse(
        false,
        "WORKSPACE_PROVISION_FAILED",
        "Failed to provision counsellor account. System rolled back.",
        null,
        [sagaMessage],
        {},
        500,
        requestId
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(requestId, "error", "fatal_error", { error: message });
    return createResponse(false, "INTERNAL_ERROR", "Internal Server Error", null, [message], {}, 500, requestId);
  }
});
