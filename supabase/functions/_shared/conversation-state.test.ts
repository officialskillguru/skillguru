import { describe, expect, it } from "vitest";
import { isConversationState, isValidTransition, nextStateOrFallback } from "./conversation-state.ts";

describe("isConversationState", () => {
  it("accepts every documented state", () => {
    expect(isConversationState("greeting")).toBe(true);
    expect(isConversationState("payment")).toBe(true);
    expect(isConversationState("human_escalation")).toBe(true);
  });

  it("rejects an unknown state", () => {
    expect(isConversationState("made_up_state")).toBe(false);
  });
});

describe("isValidTransition", () => {
  it("allows a documented forward transition", () => {
    expect(isValidTransition("greeting", "need_discovery")).toBe(true);
  });

  it("allows staying in the same state", () => {
    expect(isValidTransition("pricing_discussion", "pricing_discussion")).toBe(true);
  });

  it("rejects an undocumented jump", () => {
    expect(isValidTransition("conversation_end", "greeting")).toBe(false);
  });

  it("has no outgoing transitions from conversation_end", () => {
    expect(isValidTransition("conversation_end", "follow_up")).toBe(false);
  });
});

describe("nextStateOrFallback", () => {
  it("returns the proposed state when the transition is valid", () => {
    const result = nextStateOrFallback("greeting", "course_recommendation");
    expect(result).toEqual({ state: "course_recommendation", wasUnexpected: false });
  });

  it("falls back to 'fallback' for a completely unknown proposed state", () => {
    const result = nextStateOrFallback("greeting", "not_a_real_state");
    expect(result).toEqual({ state: "fallback", wasUnexpected: true });
  });

  it("flags an unexpected but real-state jump instead of silently accepting it", () => {
    const result = nextStateOrFallback("conversation_end", "greeting");
    expect(result.state).toBe("greeting");
    expect(result.wasUnexpected).toBe(true);
  });
});
