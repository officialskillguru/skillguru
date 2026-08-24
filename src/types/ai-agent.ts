// ============================================================================
// AI sales-agent shared vocabulary — Phase 2.6
// ============================================================================
// The canonical definitions live in the Deno edge runtime, in
// `supabase/functions/_shared/intent-schema.ts` (intents + entities) and
// `supabase/functions/_shared/conversation-state.ts` (states). Those files
// cannot be imported from the Vite app — they are Deno modules resolved through
// a separate `deno.json` with explicit `.ts` specifiers — so the unions are
// re-declared here.
//
// `agentContractParity.test.ts` reads both source files at test time and fails
// if either list drifts from the one below, so this stays a mirror rather than
// a second source of truth.
// ============================================================================

/** Mirror of `INTENTS` in `supabase/functions/_shared/intent-schema.ts`. */
export const AGENT_INTENTS = [
  "greeting",
  "general_question",
  "course_inquiry",
  "mentor_inquiry",
  "pricing",
  "admission",
  "placement",
  "certification",
  "discount",
  "scholarship",
  "technical_support",
  "complaint",
  "payment",
  "appointment",
  "human_support",
  "unknown",
] as const;

export type Intent = (typeof AGENT_INTENTS)[number];

/** Mirror of `CONVERSATION_STATES` in `supabase/functions/_shared/conversation-state.ts`. */
export const AGENT_CONVERSATION_STATES = [
  "greeting",
  "information_gathering",
  "need_discovery",
  "course_recommendation",
  "pricing_discussion",
  "objection_handling",
  "lead_qualification",
  "booking",
  "payment",
  "follow_up",
  "human_escalation",
  "conversation_end",
  "recovery",
  "fallback",
] as const;

export type ConversationState = (typeof AGENT_CONVERSATION_STATES)[number];

/** Mirror of `ExtractedEntities` in `supabase/functions/_shared/intent-schema.ts`. */
export interface ExtractedEntities {
  courseName: string | null;
  mentorName: string | null;
  price: number | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
  experienceYears: number | null;
  education: string | null;
  budget: number | null;
  timeline: string | null;
  careerGoal: string | null;
  learningMode: "online" | "offline" | "hybrid" | null;
  company: string | null;
  profession: string | null;
}

/**
 * States in which the agent has handed off, or the visitor has finished — the
 * composer stays available (a visitor may keep typing) but the UI stops
 * presenting the conversation as actively progressing.
 */
export const TERMINAL_CONVERSATION_STATES: readonly ConversationState[] = ["conversation_end", "human_escalation"];

export function isTerminalConversationState(state: ConversationState): boolean {
  return TERMINAL_CONVERSATION_STATES.includes(state);
}
