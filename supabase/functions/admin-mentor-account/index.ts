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

// One discriminated-union body per action — every privileged mentor-account
// operation this platform supports lives here so there is a single audited,
// role-checked entry point instead of one edge function per action.
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_password"), mentorId: z.string().uuid(), password: z.string().min(8, "Password must be at least 8 characters") }),
  z.object({ action: z.literal("force_password_change"), mentorId: z.string().uuid() }),
  z.object({ action: z.literal("force_logout"), mentorId: z.string().uuid() }),
  z.object({ action: z.literal("lock"), mentorId: z.string().uuid(), reason: z.string().optional() }),
  z.object({ action: z.literal("unlock"), mentorId: z.string().uuid() }),
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

    // 1. Validate caller (must be admin/super_admin) — same pattern as create-mentor.
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return createResponse(false, "UNAUTHORIZED", "Unauthorized", null, ["Missing authorization header"], 401, requestId);
    }

    // Privileged RPCs (force_logout_user, log_audit_event) rely on auth.uid(),
    // so they must run through the CALLER's own JWT-scoped client, not the
    // service-role client — a service-role call has no auth.uid() and would
    // fail those RPCs' own internal admin checks.
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
      return createResponse(false, "FORBIDDEN", "Forbidden", null, ["Only admins can manage mentor accounts"], 403, requestId);
    }

    // 2. Validate payload
    const rawBody = await req.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return createResponse(false, "VALIDATION_ERROR", "Validation failed", null, parseResult.error.errors, 400, requestId);
    }
    const body = parseResult.data;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Confirm the target mentor exists before acting (service client bypasses RLS for the lookup).
    const { data: mentorProfile, error: mentorLookupError } = await serviceClient
      .from("mentor_profiles")
      .select("id, login_disabled, locked_at, locked_by, locked_reason")
      .eq("id", body.mentorId)
      .maybeSingle();
    if (mentorLookupError) throw new Error("Mentor lookup failed: " + mentorLookupError.message);
    if (!mentorProfile) {
      return createResponse(false, "NOT_FOUND", "Mentor not found", null, [], 404, requestId);
    }

    switch (body.action) {
      case "set_password": {
        const { error } = await serviceClient.auth.admin.updateUserById(body.mentorId, { password: body.password });
        if (error) throw new Error("Password update failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "mentor_password_set",
          p_entity_type: "mentor_profile",
          p_entity_id: body.mentorId,
        });
        log(requestId, "info", "mentor_password_set", { mentorId: body.mentorId, actorId: callerId });
        return createResponse(true, "OK", "Password updated", { mentorId: body.mentorId }, [], 200, requestId);
      }

      case "force_password_change": {
        const { error } = await serviceClient
          .from("user_settings")
          .update({ password_reset_required: true })
          .eq("user_id", body.mentorId);
        if (error) throw new Error("Force password change failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "mentor_force_password_change",
          p_entity_type: "mentor_profile",
          p_entity_id: body.mentorId,
        });
        return createResponse(true, "OK", "Mentor will be required to change password on next login", { mentorId: body.mentorId }, [], 200, requestId);
      }

      case "force_logout": {
        const { error } = await callerClient.rpc("force_logout_user", { p_target_user_id: body.mentorId });
        if (error) throw new Error("Force logout failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "mentor_force_logout",
          p_entity_type: "mentor_profile",
          p_entity_id: body.mentorId,
        });
        return createResponse(true, "OK", "Mentor logged out of all sessions", { mentorId: body.mentorId }, [], 200, requestId);
      }

      case "lock": {
        const oldValues = {
          login_disabled: mentorProfile.login_disabled,
          locked_at: mentorProfile.locked_at,
          locked_reason: mentorProfile.locked_reason,
        };
        const newValues = { login_disabled: true, locked_at: new Date().toISOString(), locked_by: callerId, locked_reason: body.reason ?? null };

        const { error } = await serviceClient.from("mentor_profiles").update(newValues).eq("id", body.mentorId);
        if (error) throw new Error("Lock failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "mentor_locked",
          p_entity_type: "mentor_profile",
          p_entity_id: body.mentorId,
          p_old_values: oldValues,
          p_new_values: newValues,
        });
        return createResponse(true, "OK", "Mentor account locked", { mentorId: body.mentorId }, [], 200, requestId);
      }

      case "unlock": {
        const oldValues = {
          login_disabled: mentorProfile.login_disabled,
          locked_at: mentorProfile.locked_at,
          locked_reason: mentorProfile.locked_reason,
        };
        const newValues = { login_disabled: false, locked_at: null, locked_by: null, locked_reason: null };

        const { error } = await serviceClient.from("mentor_profiles").update(newValues).eq("id", body.mentorId);
        if (error) throw new Error("Unlock failed: " + error.message);

        await callerClient.rpc("log_audit_event", {
          p_action: "mentor_unlocked",
          p_entity_type: "mentor_profile",
          p_entity_id: body.mentorId,
          p_old_values: oldValues,
          p_new_values: newValues,
        });
        return createResponse(true, "OK", "Mentor account unlocked", { mentorId: body.mentorId }, [], 200, requestId);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Full detail is logged server-side only - the client response must never
    // leak raw DB/driver error text (constraint names, column names, etc.).
    log(requestId, "error", "fatal_error", { error: message });
    return createResponse(false, "INTERNAL_ERROR", "Something went wrong. Please try again.", null, [], 500, requestId);
  }
});
