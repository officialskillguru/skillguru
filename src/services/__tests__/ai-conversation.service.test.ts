import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as SharedModule from "../_shared";

// The value of this suite is the failure-normalisation path: `converse` reports some
// non-OK outcomes with HTTP 200 and a `code` in the body, and others with a non-2xx
// status that supabase-js surfaces as an opaque `error` with the real envelope hidden
// on `error.context`. Both must collapse to one `{ ok: false }` shape, and RATE_LIMITED
// must keep its retryAfterSeconds — otherwise the widget renders a generic error
// instead of a countdown.

const OK_TURN = {
  conversationId: "11111111-1111-4111-8111-111111111111",
  detectedIntent: "pricing",
  allIntents: ["pricing"],
  confidence: 0.9,
  conversationState: "pricing_discussion",
  leadScore: 42,
  extractedEntities: {},
  toolCalls: [],
  knowledgeSourcesUsed: [{ title: "Course X", category: "course", similarity: 0.83 }],
  suggestedNextAction: "ask for budget",
  userFacingResponse: "Course X is free.",
  internalMetadata: {
    requestId: "req-1",
    promptVersion: "2.3.0",
    latencyMs: 1200,
    tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    groundedInKnowledge: true,
    hallucinationRiskFlagged: false,
    wasUnexpectedStateTransition: false,
  },
};

function envelope(overrides: Record<string, unknown>) {
  return {
    success: true,
    code: "OK",
    message: "OK",
    data: OK_TURN,
    errors: [],
    meta: { requestId: "req-1", timestamp: "2026-08-20T00:00:00Z", version: "v1" },
    ...overrides,
  };
}

describe("ai-conversation.service", () => {
  let invoke: ReturnType<typeof vi.fn>;
  let mockSupabase: { functions: { invoke: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    invoke = vi.fn();
    mockSupabase = { functions: { invoke } };
  });

  async function loadService() {
    vi.doMock("../_shared", async () => {
      const actual = await vi.importActual<typeof SharedModule>("../_shared");
      return { ...actual, getSupabaseClientOrThrow: () => mockSupabase };
    });
    return import("../ai-conversation.service");
  }

  describe("getOrCreateVisitorId", () => {
    it("persists a single uuid across calls", async () => {
      const { getOrCreateVisitorId } = await loadService();

      const first = getOrCreateVisitorId();
      const second = getOrCreateVisitorId();

      expect(first).toMatch(/^[0-9a-f-]{36}$/);
      expect(second).toBe(first);
      expect(window.localStorage.getItem("skillguru.agent.visitorId")).toBe(first);
    });

    it("replaces a corrupted stored value rather than sending it to the server", async () => {
      // converse validates visitorId as a uuid and 400s on anything else, which would
      // wedge the widget permanently for that browser.
      window.localStorage.setItem("skillguru.agent.visitorId", "not-a-uuid");
      const { getOrCreateVisitorId } = await loadService();

      expect(getOrCreateVisitorId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("still returns an id when localStorage throws", async () => {
      // Scoped to our key only. A blanket Storage.prototype throw also hits
      // supabase auth-js's async session load, surfacing as an unhandled rejection
      // that has nothing to do with what this test asserts.
      const original = Storage.prototype.getItem;
      const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (
        this: Storage,
        key: string
      ) {
        if (key === "skillguru.agent.visitorId") throw new Error("SecurityError: cookies blocked");
        return original.call(this, key);
      });

      const { getOrCreateVisitorId } = await loadService();

      expect(getOrCreateVisitorId()).toMatch(/^[0-9a-f-]{36}$/);
      getItem.mockRestore();
    });
  });

  describe("sendAgentMessage", () => {
    it("returns the turn on success", async () => {
      invoke.mockResolvedValue({ data: envelope({}), error: null });
      const { sendAgentMessage } = await loadService();

      const result = await sendAgentMessage({ message: "how much?" });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.turn.userFacingResponse).toBe("Course X is free.");
    });

    it("omits conversationId on the first turn so converse creates the conversation", async () => {
      invoke.mockResolvedValue({ data: envelope({}), error: null });
      const { sendAgentMessage } = await loadService();

      await sendAgentMessage({ message: "hi" });

      const options = invoke.mock.calls[0]?.[1] as { body: Record<string, unknown> } | undefined;
      const body = options?.body ?? {};
      expect(body).not.toHaveProperty("conversationId");
      expect(body.channel).toBe("chat");
      expect(body.message).toBe("hi");
    });

    it("normalises a 200-with-non-OK-code envelope into a failure", async () => {
      invoke.mockResolvedValue({
        data: envelope({ success: false, code: "MISSING_PROVIDER_KEY", message: "GEMINI_API_KEY is not configured.", data: null }),
        error: null,
      });
      const { sendAgentMessage } = await loadService();

      const result = await sendAgentMessage({ message: "hi" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("MISSING_PROVIDER_KEY");
        expect(result.error.retryAfterSeconds).toBeNull();
      }
    });

    it("recovers retryAfterSeconds from a 429 hidden behind supabase-js's error", async () => {
      const body = envelope({
        success: false,
        code: "RATE_LIMITED",
        message: "Too many messages.",
        data: { retryAfterSeconds: 37 },
      });
      invoke.mockResolvedValue({
        data: null,
        error: { name: "FunctionsHttpError", context: new Response(JSON.stringify(body), { status: 429 }) },
      });
      const { sendAgentMessage } = await loadService();

      const result = await sendAgentMessage({ message: "hi" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("RATE_LIMITED");
        expect(result.error.retryAfterSeconds).toBe(37);
      }
    });

    it("falls back to NETWORK_ERROR when the error carries no readable envelope", async () => {
      invoke.mockResolvedValue({ data: null, error: { name: "FunctionsFetchError", message: "Failed to fetch" } });
      const { sendAgentMessage } = await loadService();

      const result = await sendAgentMessage({ message: "hi" });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NETWORK_ERROR");
    });

    it("treats an empty body as an internal error rather than a successful turn", async () => {
      invoke.mockResolvedValue({ data: null, error: null });
      const { sendAgentMessage } = await loadService();

      const result = await sendAgentMessage({ message: "hi" });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
