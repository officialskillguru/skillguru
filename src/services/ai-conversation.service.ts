// ============================================================================
// AI sales-agent conversation client — Phase 2.6
// ============================================================================
// Thin browser-side client for the `converse` Edge Function (Phase 2.3). All
// conversation state lives server-side in `agent_conversations`; this module
// only carries the two identifiers needed to continue a session across turns
// (`visitorId`, `conversationId`) and translates transport/HTTP failures into
// typed results the UI can render distinctly.
//
// Deliberately NOT written against the `agent_*` tables directly: anonymous
// visitors have no RLS access to them by design (see migration 20260725000001)
// and reach the agent exclusively through this function.
// ============================================================================

import { getSupabaseClientOrThrow } from "./_shared";
import type { ExtractedEntities, Intent, ConversationState } from "@/types/ai-agent";

const VISITOR_ID_STORAGE_KEY = "skillguru.agent.visitorId";

/** Mirrors the `knowledgeSourcesUsed` entries returned by `converse`. */
export interface AgentCitation {
  title: string;
  category: string;
  similarity: number;
}

export interface AgentToolCall {
  name: string;
  result: Record<string, unknown>;
  error: string | null;
}

/** The `data` payload of a successful `converse` turn. */
export interface AgentTurn {
  conversationId: string;
  detectedIntent: Intent;
  allIntents: Intent[];
  confidence: number;
  conversationState: ConversationState;
  leadScore: number;
  extractedEntities: ExtractedEntities;
  toolCalls: AgentToolCall[];
  knowledgeSourcesUsed: AgentCitation[];
  suggestedNextAction: string;
  userFacingResponse: string;
  internalMetadata: {
    requestId: string;
    promptVersion: string;
    latencyMs: number;
    tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
    groundedInKnowledge: boolean;
    hallucinationRiskFlagged: boolean;
    wasUnexpectedStateTransition: boolean;
  };
}

/** The exact `code` values `converse` can return. Kept in sync with its `ResponseCode` union. */
export type AgentResponseCode =
  | "OK"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "MISSING_PROVIDER_KEY"
  | "INTERNAL_ERROR";

interface ConverseEnvelope {
  success: boolean;
  code: AgentResponseCode;
  message: string;
  data: (AgentTurn & { retryAfterSeconds?: number }) | { retryAfterSeconds: number } | null;
  errors: unknown[];
  meta: { requestId: string; timestamp: string; version: string };
}

/**
 * A failed turn, as a value rather than a thrown error.
 *
 * Rate limiting is an expected, routine outcome of this endpoint (20 messages /
 * 60s per visitor), not an exceptional one — the UI needs to show a countdown
 * rather than a generic "something went wrong", so it is modelled explicitly.
 */
export interface AgentError {
  code: AgentResponseCode | "NETWORK_ERROR";
  message: string;
  retryAfterSeconds: number | null;
}

export type AgentResult = { ok: true; turn: AgentTurn } | { ok: false; error: AgentError };

/**
 * Stable per-browser visitor identifier.
 *
 * `converse` requires a UUID `visitorId` and checks that it matches the one that
 * opened the conversation, so this must survive reloads for a session to
 * continue. localStorage access is guarded because it throws outright in Safari
 * private mode and when cookies are blocked — an unusable widget would be a
 * worse outcome than a visitor whose history does not persist, so failure falls
 * back to an ephemeral in-memory id.
 */
let inMemoryVisitorId: string | null = null;

export function getOrCreateVisitorId(): string {
  if (inMemoryVisitorId) return inMemoryVisitorId;

  try {
    const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing && isUuid(existing)) {
      inMemoryVisitorId = existing;
      return existing;
    }
    const created = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, created);
    inMemoryVisitorId = created;
    return created;
  } catch {
    inMemoryVisitorId ??= crypto.randomUUID();
    return inMemoryVisitorId;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Clears the persisted visitor id. Used when a visitor explicitly ends/resets a chat. */
export function resetVisitorId(): void {
  inMemoryVisitorId = null;
  try {
    window.localStorage.removeItem(VISITOR_ID_STORAGE_KEY);
  } catch {
    // Non-fatal: the in-memory id is already cleared above.
  }
}

export interface SendAgentMessageParams {
  message: string;
  /** Omit on the first turn; `converse` creates the conversation and returns its id. */
  conversationId?: string;
  /** Set when the visitor is signed in, so long-term customer memory is loaded. */
  profileId?: string;
  channel?: "chat" | "voice";
}

/**
 * Sends one conversational turn.
 *
 * Never throws for a server-reported failure — `converse` answers with HTTP 200
 * for some non-OK codes and a non-2xx status for others, and supabase-js
 * surfaces those two cases very differently. Both are normalised into
 * `{ ok: false, error }` so callers have exactly one failure path to handle.
 */
export async function sendAgentMessage(params: SendAgentMessageParams): Promise<AgentResult> {
  const supabase = getSupabaseClientOrThrow();
  const visitorId = getOrCreateVisitorId();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here (same as knowledge-base.service.ts)
  const { data, error } = await supabase.functions.invoke<ConverseEnvelope>("converse", {
    body: {
      visitorId,
      message: params.message,
      channel: params.channel ?? "chat",
      ...(params.conversationId ? { conversationId: params.conversationId } : {}),
      ...(params.profileId ? { profileId: params.profileId } : {}),
    },
  });

  // supabase-js reports any non-2xx as `error` and does not parse the body, so the
  // structured envelope (including RATE_LIMITED's retryAfterSeconds) is only
  // recoverable by reading the underlying Response off the error.
  if (error) {
    const parsed = await readErrorEnvelope(error);
    if (parsed) return { ok: false, error: parsed };
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Could not reach the assistant. Please check your connection and try again.",
        retryAfterSeconds: null,
      },
    };
  }

  if (!data) {
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "The assistant returned an empty response.", retryAfterSeconds: null },
    };
  }

  if (!data.success || data.code !== "OK") {
    return { ok: false, error: toAgentError(data) };
  }

  return { ok: true, turn: data.data as AgentTurn };
}

function toAgentError(envelope: ConverseEnvelope): AgentError {
  const retryAfterSeconds =
    envelope.data && typeof envelope.data === "object" && "retryAfterSeconds" in envelope.data
      ? envelope.data.retryAfterSeconds
      : null;

  return {
    code: envelope.code,
    message: envelope.message,
    retryAfterSeconds: typeof retryAfterSeconds === "number" ? retryAfterSeconds : null,
  };
}

/**
 * supabase-js's FunctionsHttpError carries the original `Response` on `.context`;
 * its JSON body is the same envelope shape the success path returns. Reading it
 * is what lets a 429 render a real countdown instead of a generic error.
 */
async function readErrorEnvelope(error: unknown): Promise<AgentError | null> {
  if (typeof error !== "object" || error === null || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return null;

  try {
    const body = (await context.clone().json()) as ConverseEnvelope;
    if (typeof body.code !== "string") return null;
    return toAgentError(body);
  } catch {
    return null;
  }
}
