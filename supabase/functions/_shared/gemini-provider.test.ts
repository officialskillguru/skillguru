import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "./gemini-provider.ts";

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("GeminiProvider.generateStructured", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a plain text response", async () => {
    const fetchMock = mockFetchOnce(200, {
      candidates: [{ content: { parts: [{ text: "Hello there!" }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("fake-key", "gemini-2.5-flash", 5000, 1);
    const result = await provider.generateStructured({ messages: [{ role: "user", content: "hi" }] });

    expect(result.text).toBe("Hello there!");
    expect(result.toolCalls).toEqual([]);
    expect(result.usage.totalTokens).toBe(15);
    expect(result.safetyBlock).toBeNull();
  });

  it("parses a function call response", async () => {
    const fetchMock = mockFetchOnce(200, {
      candidates: [{ content: { parts: [{ functionCall: { name: "knowledge_search", args: { query: "pricing" } } }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 8, totalTokenCount: 28 },
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("fake-key", "gemini-2.5-flash", 5000, 1);
    const result = await provider.generateStructured({
      messages: [{ role: "user", content: "how much does it cost" }],
      tools: [{ name: "knowledge_search", description: "search", parameters: { type: "object", properties: {} } }],
    });

    expect(result.toolCalls).toEqual([{ name: "knowledge_search", arguments: { query: "pricing" } }]);
  });

  it("surfaces a prompt-level safety block instead of throwing", async () => {
    const fetchMock = mockFetchOnce(200, { promptFeedback: { blockReason: "SAFETY" } });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("fake-key", "gemini-2.5-flash", 5000, 1);
    const result = await provider.generateStructured({ messages: [{ role: "user", content: "hi" }] });

    expect(result.safetyBlock).toBe("SAFETY");
    expect(result.text).toBe("");
  });

  it("retries once on a 500 before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "server error" })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "recovered" }] }, finishReason: "STOP" }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("fake-key", "gemini-2.5-flash", 5000, 2);
    const result = await provider.generateStructured({ messages: [{ role: "user", content: "hi" }] });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.text).toBe("recovered");
  });

  it("throws a clear error on a non-retryable 4xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "bad request" });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("fake-key", "gemini-2.5-flash", 5000, 3);
    await expect(provider.generateStructured({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(/400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("GeminiProvider.embed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a 768-dimension embedding", async () => {
    const values = Array.from({ length: 768 }, () => 0.01);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ embedding: { values } }) }));

    const provider = new GeminiProvider("fake-key");
    const result = await provider.embed("hello");
    expect(result).toHaveLength(768);
  });

  it("throws if the embedding has the wrong dimensionality", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ embedding: { values: [1, 2, 3] } }) }));

    const provider = new GeminiProvider("fake-key");
    await expect(provider.embed("hello")).rejects.toThrow(/unexpected shape/);
  });
});
