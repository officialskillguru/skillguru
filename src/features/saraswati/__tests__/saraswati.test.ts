import { afterEach, describe, expect, it, vi } from "vitest";
import { deriveSaraswatiState, mouthOpenFromVolume } from "../saraswati-state";
import { fetchSignedUrl, SaraswatiConnectionError, SIGNED_URL_ENDPOINT } from "../saraswati.service";

describe("deriveSaraswatiState", () => {
  const base = { status: "connected", mode: "listening", awaitingReply: false, localError: false } as const;

  it("maps each session phase to an avatar state", () => {
    expect(deriveSaraswatiState({ ...base, status: "disconnected" })).toBe("idle");
    expect(deriveSaraswatiState({ ...base, status: "connecting" })).toBe("connecting");
    expect(deriveSaraswatiState(base)).toBe("listening");
    expect(deriveSaraswatiState({ ...base, awaitingReply: true })).toBe("thinking");
    expect(deriveSaraswatiState({ ...base, mode: "speaking", awaitingReply: true })).toBe("speaking");
  });

  it("errors take priority over every other signal", () => {
    expect(deriveSaraswatiState({ ...base, mode: "speaking", localError: true })).toBe("error");
    expect(deriveSaraswatiState({ ...base, status: "error" })).toBe("error");
  });
});

describe("mouthOpenFromVolume", () => {
  it("stays closed for silence and opens for speech-level volume", () => {
    let m = 0;
    for (let i = 0; i < 30; i++) m = mouthOpenFromVolume(0.005, m, 1 / 60);
    expect(m).toBeLessThan(0.01);
    for (let i = 0; i < 30; i++) m = mouthOpenFromVolume(0.25, m, 1 / 60);
    expect(m).toBeGreaterThan(0.6);
    expect(m).toBeLessThanOrEqual(1);
  });

  it("opens faster than it closes", () => {
    const opened = mouthOpenFromVolume(0.4, 0, 1 / 60);
    const closed = 1 - mouthOpenFromVolume(0, 1, 1 / 60);
    expect(opened).toBeGreaterThan(closed);
  });

  it("tolerates NaN and negative delta", () => {
    expect(mouthOpenFromVolume(Number.NaN, 0.5, -1)).toBe(0.5);
  });
});

describe("fetchSignedUrl", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the signed URL from the endpoint", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, signedUrl: "wss://x" }), { status: 200 }));
    await expect(fetchSignedUrl(f)).resolves.toBe("wss://x");
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SIGNED_URL_ENDPOINT);
    expect(init).toMatchObject({ method: "GET", cache: "no-store" });
  });

  it("turns server error codes into friendly messages", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, code: "MISSING_CONFIGURATION" }), { status: 500 }));
    const err = await fetchSignedUrl(f).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SaraswatiConnectionError);
    expect((err as SaraswatiConnectionError).code).toBe("MISSING_CONFIGURATION");
    expect((err as SaraswatiConnectionError).message).toContain("isn't configured");
  });

  it("handles a non-JSON SPA fallback (endpoint missing) and network failure", async () => {
    const html = vi.fn().mockResolvedValue(new Response("<!doctype html>", { status: 404 }));
    await expect(fetchSignedUrl(html)).rejects.toMatchObject({ code: "ENDPOINT_NOT_FOUND" });
    const spa200 = vi.fn().mockResolvedValue(new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } }));
    await expect(fetchSignedUrl(spa200)).rejects.toMatchObject({ code: "ENDPOINT_NOT_FOUND" });
    const down = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchSignedUrl(down)).rejects.toBeInstanceOf(SaraswatiConnectionError);
  });
});
