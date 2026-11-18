// Browser-side client for /api/saraswati/signed-url (Vercel Function).
// The ElevenLabs API key never reaches the browser — only a short-lived signed
// WebSocket URL does. Voice sessions in this preview do not touch Gemini or Supabase.

export const SIGNED_URL_ENDPOINT = "/api/saraswati/signed-url";

export class SaraswatiConnectionError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "SaraswatiConnectionError";
  }
}

const FRIENDLY: Record<string, string> = {
  MISSING_CONFIGURATION: "Saraswati's voice isn't configured on this deployment yet.",
  UPSTREAM_ERROR: "Saraswati couldn't connect to the voice service. Please try again.",
  UPSTREAM_TIMEOUT: "The voice service took too long to respond. Please try again.",
  FORBIDDEN_ORIGIN: "Voice sessions can only be started from the SkillGuru site.",
  RATE_LIMITED: "You've started several voice sessions in a short time. Please wait a few minutes and try again.",
};

export async function fetchSignedUrl(fetchImpl: typeof fetch = fetch): Promise<string> {
  let res: Response;
  try {
    res = await fetchImpl(SIGNED_URL_ENDPOINT, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  } catch {
    throw new SaraswatiConnectionError("Couldn't reach SkillGuru. Check your connection and try again.", "NETWORK_ERROR");
  }

  const body = (await res.json().catch(() => null)) as { ok?: boolean; signedUrl?: string; code?: string } | null;
  if (!res.ok || !body?.ok || typeof body.signedUrl !== "string") {
    // No JSON at all means the request hit the SPA fallback / a host without the function.
    const code = body?.code ?? (body === null || res.status === 404 ? "ENDPOINT_NOT_FOUND" : "UNKNOWN");
    const message =
      FRIENDLY[code] ??
      (code === "ENDPOINT_NOT_FOUND"
        ? "The voice endpoint isn't available here. It runs on the Vercel deployment."
        : "Saraswati couldn't start a voice session. Please try again.");
    throw new SaraswatiConnectionError(message, code);
  }
  return body.signedUrl;
}
