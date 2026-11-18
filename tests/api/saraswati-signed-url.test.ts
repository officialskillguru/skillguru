// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { handleSignedUrlRequest, isAllowedOrigin, RATE_LIMIT, resetRateLimit } from "../../api/saraswati/signed-url";

const API_KEY = "sk_test_super_secret_value_123";
const AGENT_ID = "agent_test_abc";
const env = { ELEVENLABS_API_KEY: API_KEY, ELEVENLABS_AGENT_ID: AGENT_ID };
const SIGNED = "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_test_abc&conversation_signature=sig";

function req(path = "/api/saraswati/signed-url", init: RequestInit & { headers?: Record<string, string> } = {}) {
  return new Request(`https://skillguru-india.vercel.app${path}`, { method: "GET", ...init, headers: { host: "skillguru-india.vercel.app", ...(init.headers ?? {}) } });
}

async function body(res: Response) {
  const text = await res.text();
  return { text, json: JSON.parse(text) as Record<string, unknown> };
}

afterEach(() => {
  resetRateLimit();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/saraswati/signed-url", () => {
  it("returns only the signed URL and calls ElevenLabs with the server-side key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ signed_url: SIGNED }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await handleSignedUrlRequest(req(), env);
    const { text, json } = await body(res);

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(json).toEqual({ ok: true, signedUrl: SIGNED });
    expect(text).not.toContain(API_KEY);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`);
    expect(url).not.toContain(API_KEY);
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe(API_KEY);
  });

  it("names missing variables without revealing any value", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleSignedUrlRequest(req(), { ELEVENLABS_AGENT_ID: AGENT_ID });
    const { text, json } = await body(res);
    expect(res.status).toBe(500);
    expect(json.code).toBe("MISSING_CONFIGURATION");
    expect(json.missing).toEqual(["ELEVENLABS_API_KEY"]);
    expect(text).not.toContain(AGENT_ID);
  });

  it("?check=1 reports presence booleans only and never calls upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSignedUrlRequest(req("/api/saraswati/signed-url?check=1"), env);
    const { text, json } = await body(res);
    expect(json).toEqual({ ok: true, configured: { ELEVENLABS_API_KEY: true, ELEVENLABS_AGENT_ID: true } });
    expect(text).not.toContain(API_KEY);
    expect(text).not.toContain(AGENT_ID);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps an upstream failure to 502 without echoing the upstream body", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`invalid key ${API_KEY}`, { status: 401 })));
    const res = await handleSignedUrlRequest(req(), env);
    const { text, json } = await body(res);
    expect(res.status).toBe(502);
    expect(json.upstreamStatus).toBe(401);
    expect(text).not.toContain(API_KEY);
  });

  it("rejects a malformed upstream payload", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ signed_url: "https://evil" }), { status: 200 })));
    const res = await handleSignedUrlRequest(req(), env);
    expect(res.status).toBe(502);
  });

  it("rejects non-GET and cross-site origins", async () => {
    expect((await handleSignedUrlRequest(req(undefined, { method: "POST" }), env)).status).toBe(405);
    expect((await handleSignedUrlRequest(req(undefined, { headers: { origin: "https://evil.example" } }), env)).status).toBe(403);
  });
});

describe("rate limiting", () => {
  it("throttles one client after RATE_LIMIT.max sessions but not other clients or ?check=1", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ signed_url: SIGNED }), { status: 200 }))));
    const from = (ip: string, path?: string) => req(path, { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
    for (let i = 0; i < RATE_LIMIT.max; i++) expect((await handleSignedUrlRequest(from("203.0.113.7"), env)).status).toBe(200);
    const limited = await handleSignedUrlRequest(from("203.0.113.7"), env);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(((await limited.json()) as { code: string }).code).toBe("RATE_LIMITED");
    expect((await handleSignedUrlRequest(from("198.51.100.2"), env)).status).toBe(200);
    expect((await handleSignedUrlRequest(from("203.0.113.7", "/api/saraswati/signed-url?check=1"), env)).status).toBe(200);
  });
});

describe("Vercel entrypoint", () => {
  it("default export exposes a Web-signature fetch handler", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", API_KEY);
    vi.stubEnv("ELEVENLABS_AGENT_ID", AGENT_ID);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await handler.fetch(req("/api/saraswati/signed-url?check=1"));
    expect(await res.json()).toEqual({ ok: true, configured: { ELEVENLABS_API_KEY: true, ELEVENLABS_AGENT_ID: true } });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

describe("isAllowedOrigin", () => {
  it("allows same-origin, local dev, and origin-less requests", () => {
    expect(isAllowedOrigin(req(undefined, { headers: { origin: "https://skillguru-india.vercel.app" } }))).toBe(true);
    expect(isAllowedOrigin(req(undefined, { headers: { origin: "http://localhost:5173" } }))).toBe(true);
    expect(isAllowedOrigin(req())).toBe(true);
  });
});
