import { describe, expect, it } from "vitest";
import { executeToolCall, TOOL_DEFINITIONS, type ToolContext } from "./tools.ts";

/**
 * Minimal chainable Supabase mock: every method (.from/.select/.eq/.insert/...)
 * returns a fresh chain object, and the chain is thenable — awaiting it
 * resolves to the next queued { data, error } result, consumed in call order.
 * This mirrors how tools.ts actually awaits its Supabase calls sequentially,
 * without needing to model supabase-js's real query builder.
 */
function createSequencedSupabaseMock(results: { data: unknown; error: unknown }[]) {
  let i = 0;
  const next = () => results[Math.min(i++, results.length - 1)] ?? { data: null, error: null };

  function chain(): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      then: (resolve: (v: unknown) => void) => resolve(next()),
    };
    for (const method of ["from", "select", "eq", "insert", "update", "delete", "single", "in", "order", "range", "gte", "is"]) {
      obj[method] = () => chain();
    }
    return obj;
  }

  return { from: () => chain(), rpc: () => chain() };
}

const fakeEmbed = async () => Array.from({ length: 768 }, () => 0.01);

describe("TOOL_DEFINITIONS", () => {
  it("declares a JSON schema for every tool with a real handler", () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toEqual(["knowledge_search", "create_lead", "update_lead", "escalate_to_human"]);
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.parameters.type).toBe("object");
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });
});

describe("executeToolCall", () => {
  it("returns an error result for an unknown tool instead of throwing", async () => {
    const ctx: ToolContext = {
      supabase: createSequencedSupabaseMock([]) as unknown as ToolContext["supabase"],
      conversationId: "conv-1",
      requestId: "req-1",
      embed: fakeEmbed,
    };
    const result = await executeToolCall({ name: "not_a_real_tool", arguments: {} }, ctx);
    expect(result.error).toMatch(/Unknown tool/);
  });

  it("knowledge_search calls match_agent_knowledge and returns its sources", async () => {
    const ctx: ToolContext = {
      supabase: createSequencedSupabaseMock([{ data: [{ chunk_id: "c1", similarity: 0.8 }], error: null }]) as unknown as ToolContext["supabase"],
      conversationId: "conv-1",
      requestId: "req-1",
      embed: fakeEmbed,
    };
    const result = await executeToolCall({ name: "knowledge_search", arguments: { query: "pricing" } }, ctx);
    expect(result.error).toBeNull();
    expect(result.result.sources).toEqual([{ chunk_id: "c1", similarity: 0.8 }]);
  });

  it("create_lead fails loudly if name is missing, rather than silently no-op-ing", async () => {
    const ctx: ToolContext = {
      supabase: createSequencedSupabaseMock([]) as unknown as ToolContext["supabase"],
      conversationId: "conv-1",
      requestId: "req-1",
      embed: fakeEmbed,
    };
    const result = await executeToolCall({ name: "create_lead", arguments: {} }, ctx);
    expect(result.error).toMatch(/requires a name/);
  });

  it("create_lead returns the existing lead id if the conversation already has one", async () => {
    const ctx: ToolContext = {
      supabase: createSequencedSupabaseMock([{ data: { lead_id: "lead-existing" }, error: null }]) as unknown as ToolContext["supabase"],
      conversationId: "conv-1",
      requestId: "req-1",
      embed: fakeEmbed,
    };
    const result = await executeToolCall({ name: "create_lead", arguments: { name: "Rahul" } }, ctx);
    expect(result.error).toBeNull();
    expect(result.result).toEqual({ leadId: "lead-existing", alreadyExisted: true });
  });

  it("update_lead refuses to run before a lead exists for the conversation", async () => {
    const ctx: ToolContext = {
      supabase: createSequencedSupabaseMock([{ data: { lead_id: null }, error: null }]) as unknown as ToolContext["supabase"],
      conversationId: "conv-1",
      requestId: "req-1",
      embed: fakeEmbed,
    };
    const result = await executeToolCall({ name: "update_lead", arguments: { budget: 20000 } }, ctx);
    expect(result.error).toMatch(/before create_lead/);
  });

  it("escalate_to_human creates a support ticket and returns it", async () => {
    const ctx: ToolContext = {
      supabase: createSequencedSupabaseMock([
        { data: { profile_id: null }, error: null },
        { data: { id: "ticket-1" }, error: null },
      ]) as unknown as ToolContext["supabase"],
      conversationId: "conv-1",
      requestId: "req-1",
      embed: fakeEmbed,
    };
    const result = await executeToolCall({ name: "escalate_to_human", arguments: { reason: "wants a human" } }, ctx);
    expect(result.error).toBeNull();
    expect(result.result).toEqual({ ticketId: "ticket-1", escalated: true });
  });
});
