import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limiter.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

function createSequencedSupabaseMock(results: { data: unknown; error: unknown; count?: number }[]) {
  let i = 0;
  const next = () => results[Math.min(i++, results.length - 1)] ?? { data: null, error: null };

  function chain(): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      then: (resolve: (v: unknown) => void) => resolve(next()),
    };
    for (const method of ["from", "select", "eq", "in", "gte"]) {
      obj[method] = () => chain();
    }
    return obj;
  }

  return { from: () => chain() };
}

describe("checkRateLimit", () => {
  it("allows a brand-new visitor with no conversations yet", async () => {
    const supabase = createSequencedSupabaseMock([{ data: [], error: null }]) as unknown as SupabaseClient;
    const result = await checkRateLimit(supabase, "visitor-1");
    expect(result.allowed).toBe(true);
    expect(result.messagesInWindow).toBe(0);
  });

  it("allows a visitor under the threshold", async () => {
    const supabase = createSequencedSupabaseMock([
      { data: [{ id: "conv-1" }], error: null },
      { data: null, error: null, count: 5 },
    ]) as unknown as SupabaseClient;
    const result = await checkRateLimit(supabase, "visitor-1");
    expect(result.allowed).toBe(true);
    expect(result.messagesInWindow).toBe(5);
  });

  it("blocks a visitor at or over the threshold and reports a retry delay", async () => {
    const supabase = createSequencedSupabaseMock([
      { data: [{ id: "conv-1" }], error: null },
      { data: null, error: null, count: 20 },
    ]) as unknown as SupabaseClient;
    const result = await checkRateLimit(supabase, "visitor-1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
