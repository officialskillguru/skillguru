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
  | "NOT_FOUND"
  | "ACTION_FAILED"
  | "INTERNAL_ERROR";

const createResponse = (
  success: boolean,
  code: ResponseCode,
  message: string,
  data: unknown = null,
  errors: unknown[] = [],
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

// Generic admin-on-any-user account actions (mentor, student, counsellor, or any
// future role) - anything that operates on the auth.users identity or the generic
// profiles/user_settings tables rather than a role-specific table (mentor_profiles).
// This exists alongside admin-mentor-account (which stays mentor_profiles-specific
// for lock/unlock, since that table already carries login_disabled/locked_reason)
// so roles without their own profile-extension table (student, counsellor) get the
// same account-lifecycle primitives without duplicating role-specific logic.
//
// lock/unlock use user_settings.is_active as the generic "login blocked" flag.
// soft_delete/restore use profiles.deleted_at, mirroring the mentor lifecycle
// convention (admin_soft_delete_mentor) — a deleted account is hidden from admin
// lists and actually can't log in (is_active is cleared + forced logout), not
// just hidden while its session/credentials still work.
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_password"), userId: z.string().uuid(), password: z.string().min(8, "Password must be at least 8 characters") }),
  z.object({ action: z.literal("force_password_change"), userId: z.string().uuid() }),
  z.object({ action: z.literal("force_logout"), userId: z.string().uuid() }),
  z.object({ action: z.literal("change_email"), userId: z.string().uuid(), newEmail: z.string().email("Enter a valid email address") }),
  z.object({ action: z.literal("lock"), userId: z.string().uuid(), reason: z.string().optional() }),
  z.object({ action: z.literal("unlock"), userId: z.string().uuid() }),
  z.object({ action: z.literal("soft_delete"), userId: z.string().uuid() }),
  z.object({ action: z.literal("restore"), userId: z.string().uuid() }),
]);

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
      return createResponse(false, "UNAUTHORIZED", "Unauthorized", null, ["Missing authorization header"], 401, requestId);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: userResp, error: userError } = await callerClient.auth.getUser();
    if (userError || !userResp.user) {
      return createResponse(false, "UNAUTHORIZED", "Unauthorized caller", null, [userError?.message], 401, requestId);
    }
    const callerId = userResp.user.id;

    const { data: callerRoles, error: roleError } = await callerClient.rpc("get_current_roles");
    if (roleError || !callerRoles || (!callerRoles.includes("admin") && !callerRoles.includes("super_admin"))) {
      return createResponse(false, "FORBIDDEN", "Forbidden", null, ["Only admins can manage user accounts"], 403, requestId);
    }

    const rawBody = await req.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return createResponse(false, "VALIDATION_ERROR", "Validation failed", null, parseResult.error.errors, 400, requestId);
    }
    const body = parseResult.data;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: targetProfile, error: lookupError } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("id", body.userId)
      .maybeSingle();
    if (lookupError) throw new Error("User lookup failed: " + lookupError.message);
    if (!targetProfile) {
      return createResponse(false, "NOT_FOUND", "User not found", null, [], 404, requestId);
    }

    switch (body.action) {
      case "set_password": {
        const { error } = await serviceClient.auth.admin.updateUserById(body.userId, { password: body.password });
        if (error) throw new Error("Password update failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "user_password_set",
          p_entity_type: "profile",
          p_entity_id: body.userId,
        });
        log(requestId, "info", "user_password_set", { userId: body.userId, actorId: callerId });
        return createResponse(true, "OK", "Password updated", { userId: body.userId }, [], 200, requestId);
      }

      case "force_password_change": {
        const { error } = await serviceClient
          .from("user_settings")
          .update({ password_reset_required: true })
          .eq("user_id", body.userId);
        if (error) throw new Error("Force password change failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "user_force_password_change",
          p_entity_type: "profile",
          p_entity_id: body.userId,
        });
        return createResponse(true, "OK", "User will be required to change password on next login", { userId: body.userId }, [], 200, requestId);
      }

      case "force_logout": {
        const { error } = await callerClient.rpc("force_logout_user", { p_target_user_id: body.userId });
        if (error) throw new Error("Force logout failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "user_force_logout",
          p_entity_type: "profile",
          p_entity_id: body.userId,
        });
        return createResponse(true, "OK", "User logged out of all sessions", { userId: body.userId }, [], 200, requestId);
      }

      case "change_email": {
        // email_confirm: true marks the new address confirmed immediately,
        // bypassing GoTrue's double opt-in "secure email change" flow (which
        // would otherwise email both the old and new addresses) - an admin
        // setting a mentor/student's email is a direct, already-verified action.
        const { error } = await serviceClient.auth.admin.updateUserById(body.userId, {
          email: body.newEmail,
          email_confirm: true,
        });
        if (error) throw new Error("Email update failed: " + error.message);

        const { error: profileError } = await serviceClient
          .from("profiles")
          .update({ email: body.newEmail })
          .eq("id", body.userId);
        if (profileError) throw new Error("Profile email sync failed: " + profileError.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "user_email_changed",
          p_entity_type: "profile",
          p_entity_id: body.userId,
          p_new_values: { email: body.newEmail },
        });
        log(requestId, "info", "user_email_changed", { userId: body.userId, actorId: callerId });
        return createResponse(true, "OK", "Email updated", { userId: body.userId }, [], 200, requestId);
      }

      case "lock": {
        const { error } = await serviceClient
          .from("user_settings")
          .update({ is_active: false })
          .eq("user_id", body.userId);
        if (error) throw new Error("Lock failed: " + error.message);

        const { error: logoutError } = await callerClient.rpc("force_logout_user", { p_target_user_id: body.userId });
        if (logoutError) log(requestId, "error", "lock_force_logout_failed", { userId: body.userId, error: logoutError.message });

        await callerClient.rpc("log_audit_event", {
          p_action: "user_locked",
          p_entity_type: "profile",
          p_entity_id: body.userId,
          p_new_values: { reason: body.reason ?? null },
        });
        log(requestId, "info", "user_locked", { userId: body.userId, actorId: callerId });
        return createResponse(true, "OK", "Account locked", { userId: body.userId }, [], 200, requestId);
      }

      case "unlock": {
        const { error } = await serviceClient
          .from("user_settings")
          .update({ is_active: true })
          .eq("user_id", body.userId);
        if (error) throw new Error("Unlock failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "user_unlocked",
          p_entity_type: "profile",
          p_entity_id: body.userId,
        });
        log(requestId, "info", "user_unlocked", { userId: body.userId, actorId: callerId });
        return createResponse(true, "OK", "Account unlocked", { userId: body.userId }, [], 200, requestId);
      }

      case "soft_delete": {
        const { error: settingsError } = await serviceClient
          .from("user_settings")
          .update({ is_active: false })
          .eq("user_id", body.userId);
        if (settingsError) throw new Error("Soft delete failed: " + settingsError.message);

        const { error: profileError } = await serviceClient
          .from("profiles")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", body.userId);
        if (profileError) throw new Error("Soft delete failed: " + profileError.message);

        const { error: logoutError } = await callerClient.rpc("force_logout_user", { p_target_user_id: body.userId });
        if (logoutError) log(requestId, "error", "soft_delete_force_logout_failed", { userId: body.userId, error: logoutError.message });

        await callerClient.rpc("log_audit_event", {
          p_action: "user_soft_deleted",
          p_entity_type: "profile",
          p_entity_id: body.userId,
        });
        log(requestId, "info", "user_soft_deleted", { userId: body.userId, actorId: callerId });
        return createResponse(true, "OK", "Account deleted", { userId: body.userId }, [], 200, requestId);
      }

      case "restore": {
        const { error: profileError } = await serviceClient
          .from("profiles")
          .update({ deleted_at: null })
          .eq("id", body.userId);
        if (profileError) throw new Error("Restore failed: " + profileError.message);

        const { error: settingsError } = await serviceClient
          .from("user_settings")
          .update({ is_active: true })
          .eq("user_id", body.userId);
        if (settingsError) throw new Error("Restore failed: " + settingsError.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "user_restored",
          p_entity_type: "profile",
          p_entity_id: body.userId,
        });
        log(requestId, "info", "user_restored", { userId: body.userId, actorId: callerId });
        return createResponse(true, "OK", "Account restored", { userId: body.userId }, [], 200, requestId);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(requestId, "error", "fatal_error", { error: message });
    return createResponse(false, "INTERNAL_ERROR", "Something went wrong. Please try again.", null, [], 500, requestId);
  }
});
