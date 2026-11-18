// ============================================================================
// GET /api/saraswati/signed-url — Vercel Function (Node.js runtime)
// ============================================================================
// Mints a short-lived ElevenLabs Conversational AI signed URL for the existing
// Saraswati agent. The browser never sees ELEVENLABS_API_KEY: it only receives
// a signed WebSocket URL that ElevenLabs expires on its own (~15 minutes).
//
// Hardening for a public, unauthenticated preview endpoint:
// - Only GET; responses are `no-store` so a signed URL is never cached/shared.
// - Cross-site browser calls are refused (Origin must match the request host or
//   an allow-listed dev origin). Not a substitute for rate limiting, which would
//   need a shared store — see the report for that remaining risk.
// - Errors name *which* variable is missing, never any value, and never echo
//   ElevenLabs' raw response body.
// ============================================================================

const ELEVENLABS_SIGNED_URL_ENDPOINT = "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url";
const UPSTREAM_TIMEOUT_MS = 10_000;
const DEV_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"]);

type ErrorCode = "METHOD_NOT_ALLOWED" | "FORBIDDEN_ORIGIN" | "MISSING_CONFIGURATION" | "UPSTREAM_ERROR" | "UPSTREAM_TIMEOUT";

function json(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function fail(status: number, code: ErrorCode, message: string, extra: Record<string, unknown> = {}): Response {
  return json(status, { ok: false, code, message, ...extra });
}

/** Same-origin (or local dev) only. Requests with no Origin (curl, same-origin GET in some browsers) are allowed. */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (DEV_ORIGINS.has(origin)) return true;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function handleSignedUrlRequest(request: Request, env: Record<string, string | undefined> = process.env): Promise<Response> {
  if (request.method !== "GET") return fail(405, "METHOD_NOT_ALLOWED", "Use GET.", {});
  if (!isAllowedOrigin(request)) return fail(403, "FORBIDDEN_ORIGIN", "Cross-origin requests are not allowed.");

  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const agentId = env.ELEVENLABS_AGENT_ID?.trim();
  const configured = { ELEVENLABS_API_KEY: Boolean(apiKey), ELEVENLABS_AGENT_ID: Boolean(agentId) };

  // Presence-only diagnostics (?check=1): lets us verify the deployment's
  // configuration without minting a URL or revealing anything about values.
  if (new URL(request.url).searchParams.get("check") === "1") {
    return json(200, { ok: configured.ELEVENLABS_API_KEY && configured.ELEVENLABS_AGENT_ID, configured });
  }

  if (!apiKey || !agentId) {
    const missing = Object.entries(configured).filter(([, present]) => !present).map(([name]) => name);
    console.error(JSON.stringify({ event: "saraswati_missing_configuration", missing }));
    return fail(500, "MISSING_CONFIGURATION", "Saraswati voice is not configured on the server.", { missing });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${ELEVENLABS_SIGNED_URL_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`, {
      method: "GET",
      headers: { "xi-api-key": apiKey },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      // Log status only; the body may echo request details.
      console.error(JSON.stringify({ event: "saraswati_upstream_error", status: upstream.status }));
      return fail(502, "UPSTREAM_ERROR", "Could not start a voice session right now.", { upstreamStatus: upstream.status });
    }

    const body = (await upstream.json().catch(() => null)) as { signed_url?: unknown } | null;
    if (!body || typeof body.signed_url !== "string" || !body.signed_url.startsWith("wss://")) {
      console.error(JSON.stringify({ event: "saraswati_upstream_bad_shape" }));
      return fail(502, "UPSTREAM_ERROR", "Could not start a voice session right now.");
    }

    return json(200, { ok: true, signedUrl: body.signed_url });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(JSON.stringify({ event: isAbort ? "saraswati_upstream_timeout" : "saraswati_upstream_network_error" }));
    return isAbort
      ? fail(504, "UPSTREAM_TIMEOUT", "The voice service took too long to respond.")
      : fail(502, "UPSTREAM_ERROR", "Could not start a voice session right now.");
  } finally {
    clearTimeout(timer);
  }
}

// Vercel Node.js runtime "Web signature" handler (documented form for files in /api).
export default {
  fetch(request: Request): Promise<Response> {
    return handleSignedUrlRequest(request);
  },
};
