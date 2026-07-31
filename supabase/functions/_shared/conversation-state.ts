// ============================================================================
// Conversation state machine — Phase 2.3
// ============================================================================
// Pure logic, no I/O. `agent_conversations.status` in the DB only tracks the
// coarse lifecycle (active/completed/abandoned/escalated) — this finer-grained
// state lives in `agent_conversations.metadata.conversationState` and drives
// which system prompt / tools are offered next, without needing a schema
// change every time a new state is added.
// ============================================================================

export const CONVERSATION_STATES = [
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

export type ConversationState = (typeof CONVERSATION_STATES)[number];

export function isConversationState(value: string): value is ConversationState {
  return (CONVERSATION_STATES as readonly string[]).includes(value);
}

/** Allowed forward transitions. Not strictly enforced (a real conversation can jump around), but used to flag a suspicious/impossible transition for logging rather than silently trusting the model's self-reported state. */
const ALLOWED_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  greeting: ["information_gathering", "need_discovery", "course_recommendation", "fallback"],
  information_gathering: ["need_discovery", "course_recommendation", "lead_qualification", "fallback"],
  need_discovery: ["course_recommendation", "pricing_discussion", "lead_qualification", "fallback"],
  course_recommendation: ["pricing_discussion", "objection_handling", "lead_qualification", "booking", "fallback"],
  pricing_discussion: ["objection_handling", "lead_qualification", "booking", "payment", "fallback"],
  objection_handling: ["pricing_discussion", "course_recommendation", "lead_qualification", "human_escalation", "fallback"],
  lead_qualification: ["booking", "payment", "follow_up", "human_escalation", "fallback"],
  booking: ["payment", "follow_up", "conversation_end", "fallback"],
  payment: ["follow_up", "conversation_end", "human_escalation", "fallback"],
  follow_up: ["conversation_end", "human_escalation", "recovery", "fallback"],
  human_escalation: ["conversation_end", "recovery"],
  conversation_end: [],
  recovery: ["greeting", "need_discovery", "human_escalation", "fallback"],
  fallback: ["greeting", "need_discovery", "human_escalation", "conversation_end"],
};

export function isValidTransition(from: ConversationState, to: ConversationState): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStateOrFallback(from: ConversationState, proposed: string): { state: ConversationState; wasUnexpected: boolean } {
  if (!isConversationState(proposed)) return { state: "fallback", wasUnexpected: true };
  if (!isValidTransition(from, proposed)) return { state: proposed, wasUnexpected: true };
  return { state: proposed, wasUnexpected: false };
}
