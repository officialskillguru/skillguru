import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Structured error/success codes returned in every response's `code` field.
type ResponseCode =
  | "OK"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "EMAIL_EXISTS"
  | "ARCHIVED_MENTOR_EXISTS"
  | "AUTH_PROVISION_FAILED"
  | "WORKSPACE_PROVISION_FAILED"
  | "ROLLBACK_FAILED"
  | "INTERNAL_ERROR";

// Standardized response payload. `code` and `details` are additive (new) fields;
// `message`/`data`/`errors` are kept as-is so existing frontend callers
// (mentors.service.ts / mentor-invite.service.ts) don't need to change.
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
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        version: "v1",
      },
    }),
    {
      status,
      headers: corsHeaders,
    }
  );
};

function log(requestId: string, level: "info" | "error", event: string, extra: Record<string, unknown> = {}) {
  const entry = { requestId, level, event, ...extra, timestamp: new Date().toISOString() };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

/** Retries a transient (network/5xx) failure a bounded number of times with short backoff. Does not retry on definitive errors (validation, 4xx business errors) — callers should only wrap calls where a retry is actually safe/idempotent. */
async function withRetry<T>(fn: () => Promise<T>, isRetryable: (result: T) => boolean, attempts = 3, backoffMs = 300): Promise<T> {
  let last: T;
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (!isRetryable(last)) return last;
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, backoffMs * (i + 1)));
  }
  return last!;
}

// Validation Schema
const createMentorSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(), // Optional for email invite flow
  phone: z.string().optional(),
  timezone: z.string().default("UTC"),
  onboardingMethod: z.enum(["manual", "invite"]).default("manual"),
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

    // 1. Validate Caller (must be admin or super_admin)
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

    // We assume the caller has 'admin' or 'super_admin' roles. Check RLS or user_roles.
    // For edge functions, relying on a secure RPC check is standard:
    const { data: callerRoles, error: roleError } = await callerClient.rpc("get_current_roles");
    if (roleError) {
      log(requestId, "error", "caller_role_check_failed", { callerId, error: roleError.message });
    }

    if (roleError || !callerRoles || (!callerRoles.includes("admin") && !callerRoles.includes("super_admin"))) {
      return createResponse(false, "FORBIDDEN", "Forbidden", null, ["Only admins can create mentors"], {}, 403, requestId);
    }

    // 2. Validate Payload
    const payload = await req.json();
    const parseResult = createMentorSchema.safeParse(payload);

    if (!parseResult.success) {
      return createResponse(false, "VALIDATION_ERROR", "Validation failed", null, parseResult.error.errors, {}, 400, requestId);
    }

    const { fullName, email, password, phone, timezone, onboardingMethod } = parseResult.data;
    // Trim + lowercase so "Test.Mentor@Example.com " and "test.mentor@example.com"
    // are always treated as the same account for duplicate detection, Auth
    // creation, and persistence (Phase 8 email normalization).
    const normalizedEmail = email.trim().toLowerCase();

    // We'll use service client to bypass RLS for provisioning
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Fast-path duplicate check (best-effort — the real guarantee is the DB's UNIQUE
    // constraint on profiles.email / auth.users.email, checked again via the
    // auth.admin.createUser() error below, so concurrent double-submits are still safe).
    //
    // A soft-deleted (archived) mentor's profiles row is intentionally kept alive
    // (it preserves courses/enrollments/reviews/audit history), so it will always
    // match here too. Without distinguishing that case, an admin who deletes a
    // mentor and tries to recreate them with the same email hits a dead-end
    // "User already exists" 409 with no path forward - the actual production bug
    // this precheck now resolves by pointing them at Restore instead.
    const { data: existingUser } = await serviceClient.from("profiles").select("id").eq("email", normalizedEmail).maybeSingle();
    if (existingUser) {
      const { data: archivedMentor } = await serviceClient
        .from("mentor_profiles")
        .select("id, deleted_at")
        .eq("id", existingUser.id)
        .not("deleted_at", "is", null)
        .maybeSingle();

      if (archivedMentor) {
        log(requestId, "info", "duplicate_email_precheck_archived", { email: normalizedEmail, mentorId: archivedMentor.id });
        return createResponse(
          false,
          "ARCHIVED_MENTOR_EXISTS",
          "This email belongs to an archived mentor. Restore the existing mentor instead of creating another account.",
          null,
          ["Email belongs to a deleted mentor account that can be restored"],
          { email: normalizedEmail, mentorId: archivedMentor.id },
          409,
          requestId
        );
      }

      log(requestId, "info", "duplicate_email_precheck", { email: normalizedEmail });
      return createResponse(false, "EMAIL_EXISTS", "An account with this email already exists.", null, ["Email is already registered"], { email: normalizedEmail }, 409, requestId);
    }

    // Determine temporary password
    const tempPassword = password || crypto.randomUUID().slice(0, 12) + "A1!";

    // ==========================================
    // SAGA PATTERN START
    // ==========================================
    let createdAuthUserId: string | null = null;

    try {
      // Step A: Create Auth User (retried once on transient failure; NOT retried if the
      // error indicates the email is already registered, which is a real business error).
      const authResult = await withRetry(
        () =>
          serviceClient.auth.admin.createUser({
            email: normalizedEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, role: "mentor" },
          }),
        (result) => Boolean(result.error) && !/already.*regist/i.test(result.error?.message ?? ""),
        3,
        300
      );

      if (authResult.error || !authResult.data.user) {
        const alreadyExists = /already.*regist/i.test(authResult.error?.message ?? "");
        if (alreadyExists) {
          return createResponse(false, "EMAIL_EXISTS", "An account with this email already exists.", null, ["Email is already registered"], { email: normalizedEmail }, 409, requestId);
        }
        throw new Error(authResult.error?.message || "Failed to create auth user");
      }

      createdAuthUserId = authResult.data.user.id;
      log(requestId, "info", "auth_user_created", { userId: createdAuthUserId });

      // Step B: Workspace Provisioning (Profile, Mentor Profile, User Settings, etc)
      // All writes here are upserts keyed on the row's real unique constraint, because
      // DB triggers (handle_new_user, trg_create_user_settings) already auto-provision
      // profiles/user_settings the instant the auth user is created — a plain insert
      // against an already-trigger-created row throws a 409 unique-violation every time.
      // Profile (role is tracked via user_roles below; profiles has no role/status columns)
      const { error: profileError } = await serviceClient.from("profiles").upsert(
        { id: createdAuthUserId, email: normalizedEmail, full_name: fullName, phone },
        { onConflict: "id" }
      );
      if (profileError) throw new Error("Profile creation failed: " + profileError.message);

      // Mentor Profile
      const { error: mentorProfileError } = await serviceClient
        .from("mentor_profiles")
        .upsert({ id: createdAuthUserId, bio: "New mentor" }, { onConflict: "id" });
      if (mentorProfileError) throw new Error("Mentor Profile creation failed: " + mentorProfileError.message);

      // Role mapping
      const { data: roleRecord, error: roleLookupError } = await serviceClient.from("roles").select("id").eq("code", "mentor").maybeSingle();
      if (roleLookupError) throw new Error("Mentor role lookup failed: " + roleLookupError.message);
      if (!roleRecord) throw new Error("Mentor role lookup failed: role code 'mentor' not found");

      const { error: roleAssignError } = await serviceClient
        .from("user_roles")
        .upsert({ user_id: createdAuthUserId, role_id: roleRecord.id }, { onConflict: "user_id,role_id" });
      if (roleAssignError) throw new Error("Role assignment failed: " + roleAssignError.message);

      // User Settings (Force password reset if manual) — upsert: trg_create_user_settings
      // already created a default row for this user the moment the profile was inserted.
      const { error: settingsError } = await serviceClient
        .from("user_settings")
        .upsert(
          { user_id: createdAuthUserId, timezone, password_reset_required: onboardingMethod === "manual" },
          { onConflict: "user_id" }
        );
      if (settingsError) throw new Error("User Settings creation failed: " + settingsError.message);

      // User Statistics (no auto-provisioning trigger exists for this table, but upsert
      // is used defensively in case this step is ever reached twice, e.g. on a future retry).
      const { error: statsError } = await serviceClient
        .from("user_statistics")
        .upsert({ user_id: createdAuthUserId }, { onConflict: "user_id" });
      if (statsError) throw new Error("User Statistics creation failed: " + statsError.message);

      // Default Calendar
      const { error: calError } = await serviceClient.from("calendars").insert({
        user_id: createdAuthUserId,
        name: "Primary Calendar",
        is_default: true,
        timezone,
      });
      if (calError) throw new Error("Calendar creation failed: " + calError.message);

      // Audit Log (best-effort — a failure here should not fail the whole mentor creation)
      const { error: auditError } = await serviceClient.from("audit_logs").insert({
        actor_id: callerId,
        target_id: createdAuthUserId,
        action: "mentor_created",
        entity_type: "mentor",
        entity_id: createdAuthUserId,
        request_id: requestId,
      });
      if (auditError) log(requestId, "error", "audit_log_failed", { userId: createdAuthUserId, error: auditError.message });

      // ==========================================
      // SAGA SUCCESS
      // ==========================================

      // No email delivery integration exists yet (tracked separately). Until one does,
      // return the temporary password so the admin can hand it to the mentor directly.
      // Never logged; only returned once, over HTTPS, to the authenticated admin caller.
      log(requestId, "info", "mentor_provisioned", { userId: createdAuthUserId, onboardingMethod });

      return createResponse(
        true,
        "OK",
        "Mentor account provisioned successfully",
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
        // Delete cascades to profiles/mentor_profiles/user_roles/user_settings/user_statistics/
        // calendars via ON DELETE CASCADE FKs — but only if this call actually succeeds, so
        // its result is checked and retried instead of being assumed to have worked.
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
            "Mentor provisioning failed and automatic cleanup also failed. This account requires manual review.",
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
        "Failed to provision mentor account. System rolled back.",
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
