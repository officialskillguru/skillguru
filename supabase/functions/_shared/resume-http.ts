// ============================================================================
// Shared HTTP plumbing for the resume-ai and resume-pdf Edge Functions.
// ============================================================================
// Envelope: { success, message, code, data, retryAfterSeconds?, meta }.
// `message` is always student-safe; internal details go to logs (PII-masked),
// never to the response.
// ============================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { maskPII } from "./pii-safe-logging.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export function jsonResponse(
  status: number,
  body: { success: boolean; message: string; code: string; data?: unknown; retryAfterSeconds?: number },
  requestId: string,
): Response {
  const headers: Record<string, string> = { ...corsHeaders };
  if (body.retryAfterSeconds) headers["Retry-After"] = String(body.retryAfterSeconds);
  return new Response(
    JSON.stringify({ ...body, data: body.data ?? null, meta: { requestId, timestamp: new Date().toISOString(), version: "v1" } }),
    { status, headers },
  );
}

export const fail = (status: number, code: string, message: string, requestId: string, retryAfterSeconds?: number) =>
  jsonResponse(status, { success: false, code, message, retryAfterSeconds }, requestId);

export const ok = (data: unknown, requestId: string, status = 200) => jsonResponse(status, { success: true, code: "OK", message: "OK", data }, requestId);

/** Structured log line without resume content; free text is PII-masked. */
export function logEvent(fn: string, requestId: string, event: string, details: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) safe[k] = typeof v === "string" ? maskPII(v).slice(0, 300) : v;
  console.log(JSON.stringify({ fn, requestId, event, ...safe }));
}

export type AuthedContext = {
  userId: string;
  /** Client acting AS the student: every query is bounded by RLS. */
  userClient: SupabaseClient;
  /** Service-role client. Bypasses RLS - only for quota/job/storage writes after ownership is verified. */
  serviceClient: SupabaseClient;
};

/** Verifies the caller's Supabase JWT. Identity always comes from the token, never from the body. */
export async function authenticate(req: Request): Promise<AuthedContext | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Missing Supabase configuration");

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { userId: data.user.id, userClient, serviceClient };
}

/** Reads a JSON body with a hard byte limit (Content-Length can be absent or wrong, so the text is measured too). */
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new RangeError("too large");
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new RangeError("too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new SyntaxError("invalid json");
  }
}
