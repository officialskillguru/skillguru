import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type ResponseCode = "OK" | "UNAUTHORIZED" | "VALIDATION_ERROR" | "ACTION_FAILED" | "INTERNAL_ERROR";

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

const bodySchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Lets an authenticated user set their OWN password via the service-role
// client, which bypasses GoTrue's "Secure password change" reauthentication
// requirement (that OTP-nonce flow only applies to self-service
// auth.updateUser() calls, not the admin API) - avoids depending on outbound
// email for the force-password-change flow. This never touches any account
// other than the caller's own, so no role check is needed beyond a valid JWT.
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

    const rawBody = await req.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return createResponse(false, "VALIDATION_ERROR", "Validation failed", null, parseResult.error.errors, 400, requestId);
    }
    const { password } = parseResult.data;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: passwordError } = await serviceClient.auth.admin.updateUserById(callerId, { password });
    if (passwordError) throw new Error("Password update failed: " + passwordError.message);

    const { error: settingsError } = await serviceClient
      .from("user_settings")
      .update({ password_reset_required: false })
      .eq("user_id", callerId);
    if (settingsError) throw new Error("Clearing password_reset_required failed: " + settingsError.message);

    log(requestId, "info", "own_password_set", { callerId });
    return createResponse(true, "OK", "Password updated", null, [], 200, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(requestId, "error", "fatal_error", { error: message });
    return createResponse(false, "INTERNAL_ERROR", "Something went wrong. Please try again.", null, [], 500, requestId);
  }
});
