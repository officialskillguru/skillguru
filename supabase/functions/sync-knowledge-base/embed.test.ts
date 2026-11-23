import { afterEach, describe, expect, it, vi } from "vitest";
import { EMBEDDING_DIM, embedText } from "./embed.ts";

const KEY = "AIza-test-secret-key-123";

function okEmbedding() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ embedding: { values: new Array(EMBEDDING_DIM).fill(0.1) } }),
    text: async () => "",
  });
}

describe("sync-knowledge-base embedText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the API key in the x-goog-api-key header, never in the URL", async () => {
    const fetchMock = okEmbedding();
    vi.stubGlobal("fetch", fetchMock);

    const values = await embedText("hello", KEY);

    expect(values).toHaveLength(EMBEDDING_DIM);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(KEY);
    expect(url).not.toContain("key=");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(KEY);
  });

  it("keeps the request body unchanged (RETRIEVAL_DOCUMENT, 768 dims)", async () => {
    const fetchMock = okEmbedding();
    vi.stubGlobal("fetch", fetchMock);

    await embedText("hello", KEY);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBEDDING_DIM, content: { parts: [{ text: "hello" }] } });
  });

  it("does not leak the key when fetch throws a network error that embeds the URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      return Promise.reject(new TypeError(`error sending request for url (${url}?key=${KEY})`));
    }));

    const error = await embedText("hello", KEY).catch((e: unknown) => e as Error);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).not.toContain(KEY);
    expect(error.message).toContain("Gemini embedding request failed");
  });

  it("redacts the key if an error response body echoes it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => `API key not valid: ${KEY}`,
    }));

    const error = await embedText("hello", KEY).catch((e: unknown) => e as Error);

    expect(error.message).toContain("(400)");
    expect(error.message).not.toContain(KEY);
  });

  it("rejects a response with the wrong embedding size", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ embedding: { values: [0.1, 0.2] } }),
      text: async () => "",
    }));

    await expect(embedText("hello", KEY)).rejects.toThrow(/unexpected shape/);
  });
});
