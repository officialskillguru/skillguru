// ============================================================================
// Worker request authentication (HMAC-SHA256, shared secret).
// ============================================================================
// The resume-pdf Edge Function signs `<unix-seconds>.<sha256(body) hex>` with
// RESUME_PDF_WORKER_SECRET. The worker rejects missing/invalid signatures and
// timestamps outside a 5-minute window (replay protection). WebCrypto only,
// so the identical signer runs in Deno (supabase/functions/_shared/
// pdf-worker-client.ts) and this verifier runs in Node.
// ============================================================================

export const SIGNATURE_HEADER = "x-sg-signature";
export const TIMESTAMP_HEADER = "x-sg-timestamp";
export const MAX_SKEW_SECONDS = 300;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(body: Uint8Array | string): Promise<string> {
  const data = typeof body === "string" ? enc.encode(body) : new Uint8Array(body);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

export async function signRequest(secret: string, body: Uint8Array | string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${await sha256Hex(body)}`)));
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyRequest(
  secret: string,
  body: Uint8Array | string,
  timestampHeader: string | null | undefined,
  signatureHeader: string | null | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!secret || secret.length < 32 || !timestampHeader || !signatureHeader) return false;
  if (!/^\d{9,11}$/.test(timestampHeader) || !/^[0-9a-f]{64}$/.test(signatureHeader)) return false;
  const ts = Number(timestampHeader);
  if (Math.abs(nowSeconds - ts) > MAX_SKEW_SECONDS) return false;
  const expected = await signRequest(secret, body, ts);
  return timingSafeEqualHex(expected, signatureHeader);
}
