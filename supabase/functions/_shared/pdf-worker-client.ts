// ============================================================================
// Client for the Cloud Run resume PDF worker (HMAC-signed requests).
// ============================================================================
// Signature scheme must stay identical to services/resume-pdf-worker/src/auth.ts
// (cross-checked by resume-pdf-worker-client.test.ts).
// ============================================================================

const enc = new TextEncoder();

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function signWorkerRequest(secret: string, body: string, timestamp: number): Promise<string> {
  const bodyHash = toHex(await crypto.subtle.digest("SHA-256", enc.encode(body)));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${bodyHash}`)));
}

export type WorkerResult =
  | { ok: true; pdf: Uint8Array; pages: number }
  | { ok: false; code: string; status: number; characters?: string[]; missing?: string[] };

export async function callPdfWorker(
  workerUrl: string,
  secret: string,
  payload: { requestId: string; templateId: string; resumeData: unknown },
  timeoutMs = 60_000,
): Promise<WorkerResult> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signWorkerRequest(secret, body, timestamp);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(new URL("/compile", workerUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sg-timestamp": String(timestamp), "x-sg-signature": signature },
      body,
      signal: controller.signal,
    });
    if (res.ok && res.headers.get("content-type")?.startsWith("application/pdf")) {
      return { ok: true, pdf: new Uint8Array(await res.arrayBuffer()), pages: Number(res.headers.get("x-resume-pages") ?? "0") };
    }
    const json = (await res.json().catch(() => ({}))) as { code?: string; characters?: string[]; missing?: string[] };
    return { ok: false, code: json.code ?? "WORKER_ERROR", status: res.status, characters: json.characters, missing: json.missing };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return { ok: false, code: aborted ? "WORKER_TIMEOUT" : "WORKER_UNREACHABLE", status: 0 };
  } finally {
    clearTimeout(timer);
  }
}
