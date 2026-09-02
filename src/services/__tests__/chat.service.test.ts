import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as SharedModule from "../_shared";

type QueryResult = { data: unknown; error: unknown };

function makeQueryResult(result: QueryResult) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        const promise = Promise.resolve(result);
        return promise.then.bind(promise);
      }
      if (prop === "catch" || prop === "finally") {
        const promise = Promise.resolve(result);
        return (promise as unknown as Record<string, unknown>)[prop];
      }
      return () => proxy;
    },
  };
  const proxy = new Proxy({}, handler);
  return proxy;
}

describe("chat.service", () => {
  let fromResults: Record<string, QueryResult>;
  let rpcResults: Record<string, { data: unknown; error: unknown }>;
  let authUser: { id: string } | null;
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
    auth: { getUser: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.resetModules();
    fromResults = {};
    rpcResults = {};
    authUser = { id: "mentor-1" };

    mockSupabase = {
      from: vi.fn((table: string) => makeQueryResult(fromResults[table] ?? { data: null, error: null })),
      rpc: vi.fn(() => Promise.resolve(rpcResults.rpc ?? { data: null, error: null })),
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: authUser } })) },
    };
  });

  async function loadService() {
    vi.doMock("../_shared", async () => {
      const actual = await vi.importActual<typeof SharedModule>("../_shared");
      return { ...actual, getSupabaseClientOrThrow: () => mockSupabase, getExtendedSupabaseClient: () => mockSupabase };
    });
    return import("../chat.service");
  }

  describe("startAuthorizedDirectConversation", () => {
    it("returns the conversation id from the RPC on success", async () => {
      rpcResults.rpc = { data: "conv-123", error: null };
      const { chatService } = await loadService();
      const result = await chatService.startAuthorizedDirectConversation("student-1");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("start_direct_conversation", { p_other_user_id: "student-1" });
      expect(result).toEqual({ success: true, data: "conv-123" });
    });

    it("surfaces an authorization error from the RPC as a failure result, not a thrown exception", async () => {
      rpcResults.rpc = { data: null, error: { message: "Not authorized to message this user", code: "P0001" } };
      const { chatService } = await loadService();
      const result = await chatService.startAuthorizedDirectConversation("unrelated-student");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Not authorized to message this user");
      }
    });
  });

  describe("listAuthorizedRecipients", () => {
    it("returns the server-computed recipient directory", async () => {
      rpcResults.rpc = {
        data: [{ id: "admin-1", full_name: "Admin One", email: "admin@test.local", role: "admin" }],
        error: null,
      };
      const { chatService } = await loadService();
      const result = await chatService.listAuthorizedRecipients();
      expect(mockSupabase.rpc).toHaveBeenCalledWith("list_authorized_message_recipients");
      expect(result).toEqual({
        success: true,
        data: [{ id: "admin-1", full_name: "Admin One", email: "admin@test.local", role: "admin" }],
      });
    });

    it("returns an empty array (never null) when the RPC returns no rows", async () => {
      rpcResults.rpc = { data: null, error: null };
      const { chatService } = await loadService();
      const result = await chatService.listAuthorizedRecipients();
      expect(result).toEqual({ success: true, data: [] });
    });
  });

  describe("getOrCreateDirectConversation removal", () => {
    it("is no longer exported - startAuthorizedDirectConversation is the sanctioned replacement", async () => {
      const { chatService } = await loadService();
      expect((chatService as Record<string, unknown>).getOrCreateDirectConversation).toBeUndefined();
    });
  });

  // Regression test for a real bug found during live QA: PostgREST cannot resolve a
  // self-referencing FK embed (`chat_messages!chat_messages_reply_to_id_fkey`) on this
  // table - confirmed live via a direct REST call returning PGRST200 even immediately
  // after a schema cache reload. getMessages was rewritten to fetch reply_to data via a
  // second, flat (non-embedded) query instead. This test locks in that two-query shape
  // so a future refactor can't silently reintroduce the broken embed.
  describe("getMessages", () => {
    it("hydrates reply_to via a separate flat query, not an embedded self-join", async () => {
      const mainRows = [
        { id: "msg-2", conversation_id: "conv-1", sender_id: "u2", content: "reply", reply_to_id: "msg-1", created_at: "2026-01-02" },
        { id: "msg-1", conversation_id: "conv-1", sender_id: "u1", content: "original", reply_to_id: null, created_at: "2026-01-01" },
      ];
      const replyRows = [{ id: "msg-1", content: "original", sender_id: "u1" }];

      let chatMessagesCallCount = 0;
      const fromMock = vi.fn((table: string) => {
        if (table !== "chat_messages") return makeQueryResult({ data: null, error: null });
        chatMessagesCallCount += 1;
        const isFirstCall = chatMessagesCallCount === 1;
        const builder: Record<string, unknown> = {};
        const chain = () => builder;
        builder.select = vi.fn(chain);
        builder.eq = vi.fn(chain);
        builder.order = vi.fn(chain);
        builder.limit = vi.fn(chain);
        builder.lt = vi.fn(chain);
        builder.in = vi.fn(chain);
        builder.then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve(isFirstCall ? { data: mainRows, error: null } : { data: replyRows, error: null }).then(resolve);
        return builder;
      });
      mockSupabase.from = fromMock;

      const { chatService } = await loadService();
      const result = await chatService.getMessages("conv-1");

      expect(chatMessagesCallCount).toBe(2);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const reply = result.data.find((m) => m.id === "msg-2");
      expect(reply?.reply_to).toEqual({ id: "msg-1", content: "original", sender_id: "u1" });
    });

    it("skips the reply_to lookup query entirely when no message in the page has a reply_to_id", async () => {
      const mainRows = [{ id: "msg-1", conversation_id: "conv-1", sender_id: "u1", content: "original", reply_to_id: null, created_at: "2026-01-01" }];

      let chatMessagesCallCount = 0;
      const fromMock = vi.fn((table: string) => {
        if (table !== "chat_messages") return makeQueryResult({ data: null, error: null });
        chatMessagesCallCount += 1;
        const builder: Record<string, unknown> = {};
        const chain = () => builder;
        builder.select = vi.fn(chain);
        builder.eq = vi.fn(chain);
        builder.order = vi.fn(chain);
        builder.limit = vi.fn(chain);
        builder.lt = vi.fn(chain);
        builder.in = vi.fn(chain);
        builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: mainRows, error: null }).then(resolve);
        return builder;
      });
      mockSupabase.from = fromMock;

      const { chatService } = await loadService();
      const result = await chatService.getMessages("conv-1");

      expect(chatMessagesCallCount).toBe(1);
      expect(result).toEqual({ success: true, data: mainRows });
    });
  });
});
