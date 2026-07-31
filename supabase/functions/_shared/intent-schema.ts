// ============================================================================
// Intent + entity extraction schema — Phase 2.3
// ============================================================================
// Pure constants/types, no I/O. Used both to build the Gemini structured-output
// JSON schema and to validate what comes back.
// ============================================================================

export const INTENTS = [
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

export type Intent = (typeof INTENTS)[number];

export function isIntent(value: string): value is Intent {
  return (INTENTS as readonly string[]).includes(value);
}

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

export const EMPTY_ENTITIES: ExtractedEntities = {
  courseName: null,
  mentorName: null,
  price: null,
  email: null,
  phone: null,
  name: null,
  city: null,
  country: null,
  experienceYears: null,
  education: null,
  budget: null,
  timeline: null,
  careerGoal: null,
  learningMode: null,
  company: null,
  profession: null,
};

/** JSON Schema handed to Gemini's responseSchema so intent/entity/state extraction comes back as real structured data instead of parsed free text. */
export const AGENT_TURN_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    intents: {
      type: "array",
      items: { type: "string", enum: [...INTENTS] },
      description: "All intents present in the user's message, most prominent first. Usually one, but a message can carry more than one (e.g. pricing + discount).",
    },
    confidence: { type: "number", description: "0.0-1.0 confidence in the primary (first) detected intent." },
    conversationState: {
      type: "string",
      enum: [
        "greeting", "information_gathering", "need_discovery", "course_recommendation",
        "pricing_discussion", "objection_handling", "lead_qualification", "booking",
        "payment", "follow_up", "human_escalation", "conversation_end", "recovery", "fallback",
      ],
      description: "The conversation state after this turn.",
    },
    entities: {
      type: "object",
      properties: {
        courseName: { type: "string", nullable: true },
        mentorName: { type: "string", nullable: true },
        price: { type: "number", nullable: true },
        email: { type: "string", nullable: true },
        phone: { type: "string", nullable: true },
        name: { type: "string", nullable: true },
        city: { type: "string", nullable: true },
        country: { type: "string", nullable: true },
        experienceYears: { type: "number", nullable: true },
        education: { type: "string", nullable: true },
        budget: { type: "number", nullable: true },
        timeline: { type: "string", nullable: true },
        careerGoal: { type: "string", nullable: true },
        learningMode: { type: "string", enum: ["online", "offline", "hybrid"], nullable: true },
        company: { type: "string", nullable: true },
        profession: { type: "string", nullable: true },
      },
    },
    suggestedNextAction: { type: "string", description: "One short sentence: what the agent should do next (e.g. 'offer a demo', 'ask for budget', 'escalate to a human')." },
    userFacingResponse: { type: "string", description: "The actual reply to show/speak to the user. Must be grounded only in the provided knowledge context — if the context doesn't answer the question, say so honestly instead of guessing." },
    groundedInKnowledge: { type: "boolean", description: "True if userFacingResponse relied on the retrieved knowledge context for any factual claim (pricing, courses, mentors, policies). False for pure chit-chat/greetings with no factual claims." },
  },
  required: ["intents", "confidence", "conversationState", "entities", "suggestedNextAction", "userFacingResponse", "groundedInKnowledge"],
};
