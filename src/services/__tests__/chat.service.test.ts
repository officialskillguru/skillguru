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
});
