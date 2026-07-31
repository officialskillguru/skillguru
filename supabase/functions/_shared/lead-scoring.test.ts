import { describe, expect, it } from "vitest";
import { scoreLead } from "./lead-scoring.ts";
import { EMPTY_ENTITIES } from "./intent-schema.ts";

describe("scoreLead", () => {
  it("scores a cold, anonymous browsing conversation near zero", () => {
    const result = scoreLead({
      entities: EMPTY_ENTITIES,
      conversationState: "greeting",
      intentsSeen: ["general_question"],
      messageCount: 1,
      hasContactInfo: false,
    });
    expect(result.score).toBeLessThan(10);
    expect(result.urgency).toBe("low");
  });

  it("scores a fully-qualified, ready-to-pay lead high", () => {
    const result = scoreLead({
      entities: {
        ...EMPTY_ENTITIES,
        budget: 50000,
        timeline: "this week",
        careerGoal: "become a full stack developer",
        education: "B.Tech",
        experienceYears: 2,
      },
      conversationState: "payment",
      intentsSeen: ["pricing", "payment", "admission"],
      messageCount: 12,
      hasContactInfo: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.urgency).toBe("high");
  });

  it("never exceeds 100 or drops below 0", () => {
    const result = scoreLead({
      entities: { ...EMPTY_ENTITIES, budget: 999999, timeline: "asap", careerGoal: "x", education: "y", experienceYears: 10 },
      conversationState: "payment",
      intentsSeen: ["payment", "admission", "pricing", "discount", "scholarship", "appointment"],
      messageCount: 100,
      hasContactInfo: true,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("gives a mid-range score to a partially-qualified lead", () => {
    const result = scoreLead({
      entities: { ...EMPTY_ENTITIES, budget: 30000 },
      conversationState: "pricing_discussion",
      intentsSeen: ["pricing"],
      messageCount: 4,
      hasContactInfo: true,
    });
    expect(result.score).toBeGreaterThan(10);
    expect(result.score).toBeLessThan(65);
    expect(result.breakdown.contactInfo).toBe(20);
    expect(result.breakdown.budgetStated).toBe(15);
  });

  it("returns a breakdown that sums to the total score", () => {
    const input = {
      entities: { ...EMPTY_ENTITIES, budget: 20000, timeline: "next month" },
      conversationState: "need_discovery" as const,
      intentsSeen: ["course_inquiry" as const],
      messageCount: 3,
      hasContactInfo: false,
    };
    const result = scoreLead(input);
    const breakdownSum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    expect(result.score).toBe(Math.max(0, Math.min(100, Math.round(breakdownSum))));
  });
});
