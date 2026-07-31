// ============================================================================
// Lead scoring — Phase 2.3
// ============================================================================
// Pure, deterministic, documented scoring — not an LLM call. A lead score
// that changes for reasons nobody can explain is worse than no score at all.
// Output: 0-100, matching the `leads.lead_score` CHECK constraint added in
// Phase 2.1 (migration 20260725000001).
// ============================================================================

import type { ExtractedEntities } from "./intent-schema.ts";
import type { ConversationState } from "./conversation-state.ts";
import type { Intent } from "./intent-schema.ts";

export interface LeadScoreInput {
  entities: ExtractedEntities;
  conversationState: ConversationState;
  intentsSeen: Intent[];
  messageCount: number;
  hasContactInfo: boolean;
}

export interface LeadScoreResult {
  score: number;
  urgency: "low" | "medium" | "high";
  breakdown: Record<string, number>;
}

const MAX_SCORE = 100;

export function scoreLead(input: LeadScoreInput): LeadScoreResult {
  const breakdown: Record<string, number> = {};

  // Contact info captured — the single strongest signal a visitor is a real lead, not a browser.
  breakdown.contactInfo = input.hasContactInfo ? 20 : 0;

  // Budget stated at all (regardless of amount) signals serious intent to buy.
  breakdown.budgetStated = input.entities.budget !== null ? 15 : 0;

  // Explicit timeline ("this week", "next month") beats a vague "someday".
  const timeline = input.entities.timeline?.toLowerCase() ?? "";
  if (/\b(today|tomorrow|this week|asap|immediately)\b/.test(timeline)) breakdown.timeline = 20;
  else if (/\b(this month|few weeks|soon)\b/.test(timeline)) breakdown.timeline = 12;
  else if (timeline.length > 0) breakdown.timeline = 5;
  else breakdown.timeline = 0;

  // Career goal + education/experience given together = a real, considered decision, not idle browsing.
  breakdown.profileCompleteness =
    (input.entities.careerGoal ? 5 : 0) +
    (input.entities.education ? 5 : 0) +
    (input.entities.experienceYears !== null ? 5 : 0);

  // High-intent conversation states weigh more than early-funnel ones.
  const stateWeights: Partial<Record<ConversationState, number>> = {
    payment: 20,
    booking: 18,
    lead_qualification: 12,
    pricing_discussion: 8,
    objection_handling: 6,
    course_recommendation: 4,
    need_discovery: 2,
  };
  breakdown.conversationState = stateWeights[input.conversationState] ?? 0;

  // High-intent intents (pricing/admission/payment/discount) beat pure info-seeking.
  const intentWeights: Partial<Record<Intent, number>> = {
    payment: 10,
    admission: 8,
    pricing: 6,
    discount: 5,
    scholarship: 5,
    appointment: 6,
  };
  breakdown.intentSignals = Math.min(
    15,
    input.intentsSeen.reduce((sum, intent) => sum + (intentWeights[intent] ?? 0), 0)
  );

  // Sustained engagement (more turns) is a mild positive signal, capped so a long
  // rambling conversation with no real signal doesn't outscore a short decisive one.
  breakdown.engagement = Math.min(5, Math.floor(input.messageCount / 4));

  const rawTotal = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const score = Math.max(0, Math.min(MAX_SCORE, Math.round(rawTotal)));

  const urgency: LeadScoreResult["urgency"] = score >= 65 ? "high" : score >= 35 ? "medium" : "low";

  return { score, urgency, breakdown };
}
