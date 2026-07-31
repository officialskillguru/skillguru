import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAIProvider } from "../_shared/ai-provider-factory.ts";
import { TOOL_DEFINITIONS, executeToolCall, type ToolContext } from "../_shared/tools.ts";
import { buildSystemPrompt, PROMPT_VERSION, type KnowledgeSource } from "../_shared/prompt-manager.ts";
import { nextStateOrFallback, type ConversationState } from "../_shared/conversation-state.ts";
import { isIntent, EMPTY_ENTITIES, AGENT_TURN_RESPONSE_SCHEMA, type ExtractedEntities, type Intent } from "../_shared/intent-schema.ts";
import { scoreLead } from "../_shared/lead-scoring.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { maskPII, detectPossibleInjection } from "../_shared/pii-safe-logging.ts";
import type { ChatMessage, ToolCall } from "../_shared/ai-provider-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type ResponseCode = "OK" | "VALIDATION_ERROR" | "RATE_LIMITED" | "NOT_FOUND" | "MISSING_PROVIDER_KEY" | "INTERNAL_ERROR";

const createResponse = (
  success: boolean,
  code: ResponseCode,
  message: string,
  data: unknown = null,
  errors: unknown[] = [],
  status: number = 200,
  requestId: string = crypto.randomUUID()
) => new Response(
  JSON.stringify({ success, code, message, data, errors, meta: { requestId, timestamp: new Date().toISOString(), version: "v1" } }),
  { status, headers: corsHeaders }
);

function log(requestId: string, level: "info" | "error", event: string, extra: Record<string, unknown> = {}) {
  const entry = { requestId, level, event, ...extra, timestamp: new Date().toISOString() };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

const requestSchema = z.object({
  visitorId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  channel: z.enum(["voice", "chat"]).default("chat"),
});

const MAX_TOOL_ROUNDS = 3;

function mergeEntities(base: ExtractedEntities, incoming: Partial<ExtractedEntities>): ExtractedEntities {
  const merged = { ...base };
  for (const key of Object.keys(incoming) as (keyof ExtractedEntities)[]) {
    const value = incoming[key];
    if (value !== null && value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";

    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase configuration");
    if (!geminiApiKey) {
      return createResponse(false, "MISSING_PROVIDER_KEY", "GEMINI_API_KEY is not configured as an Edge Function secret.", null, [], 500, requestId);
    }

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = requestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return createResponse(false, "VALIDATION_ERROR", "Validation failed", null, parseResult.error.errors, 400, requestId);
    }
    const { visitorId, conversationId, profileId, message, channel } = parseResult.data;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const provider = createAIProvider("gemini", geminiApiKey, geminiModel);

    // ------------------------------------------------------------------
    // Rate limiting (public, unauthenticated endpoint — DB-backed, see
    // rate-limiter.ts for why an in-memory counter would not work here).
    // ------------------------------------------------------------------
    const rateLimit = await checkRateLimit(supabase, visitorId);
    if (!rateLimit.allowed) {
      log(requestId, "info", "rate_limited", { visitorId, messagesInWindow: rateLimit.messagesInWindow });
      return createResponse(
        false,
        "RATE_LIMITED",
        `Too many messages. Please wait ${rateLimit.retryAfterSeconds}s before trying again.`,
        { retryAfterSeconds: rateLimit.retryAfterSeconds },
        [],
        429,
        requestId
      );
    }

    if (detectPossibleInjection(message)) {
      log(requestId, "info", "possible_injection_detected", { visitorId, conversationId });
      // Not blocked — flagged only. The system prompt itself instructs the model to
      // decline injection attempts gracefully rather than silently rejecting the turn,
      // which would also reject legitimate messages that happen to match the heuristic.
    }

    // ------------------------------------------------------------------
    // Load or create the conversation
    // ------------------------------------------------------------------
    interface ConversationRow {
      id: string;
      visitor_id: string;
      profile_id: string | null;
      lead_id: string | null;
      status: string;
      metadata: { conversationState?: string; entities?: Partial<ExtractedEntities>; intentsSeen?: string[] };
      started_at: string;
    }

    let conversation: ConversationRow;
    if (conversationId) {
      const { data, error } = await supabase.from("agent_conversations").select("*").eq("id", conversationId).maybeSingle();
      if (error) throw new Error("Failed to load conversation: " + error.message);
      if (!data) return createResponse(false, "NOT_FOUND", "Conversation not found", null, [], 404, requestId);
      if (data.visitor_id !== visitorId) {
        return createResponse(false, "VALIDATION_ERROR", "visitorId does not match this conversation", null, [], 400, requestId);
      }
      conversation = data as ConversationRow;
    } else {
      const { data, error } = await supabase
        .from("agent_conversations")
        .insert({ visitor_id: visitorId, profile_id: profileId ?? null, channel, status: "active", metadata: { conversationState: "greeting", entities: {}, intentsSeen: [] } })
        .select("*")
        .single();
      if (error || !data) throw new Error("Failed to create conversation: " + (error?.message ?? "no row returned"));
      conversation = data as ConversationRow;
    }

    const currentState: ConversationState = (conversation.metadata.conversationState as ConversationState) ?? "greeting";
    const collectedEntities: ExtractedEntities = mergeEntities(EMPTY_ENTITIES, conversation.metadata.entities ?? {});
    const intentsSeen = (conversation.metadata.intentsSeen ?? []) as Intent[];

    // ------------------------------------------------------------------
    // Short-term memory: recent turns in this conversation
    // ------------------------------------------------------------------
    const { data: recentMessages, error: messagesError } = await supabase
      .from("agent_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(20);
    if (messagesError) throw new Error("Failed to load conversation history: " + messagesError.message);

    // ------------------------------------------------------------------
    // Long-term memory: customer profile, if this visitor is a known profile
    // ------------------------------------------------------------------
    let memoryContext = null;
    const effectiveProfileId = conversation.profile_id ?? profileId ?? null;
    if (effectiveProfileId) {
      const { data: memory } = await supabase
        .from("agent_customer_memory")
        .select("interaction_summary, preferred_courses, total_conversations")
        .eq("profile_id", effectiveProfileId)
        .maybeSingle();
      if (memory) {
        let preferredCourseTitles: string[] = [];
        if (memory.preferred_courses && memory.preferred_courses.length > 0) {
          const { data: courses } = await supabase.from("courses").select("title").in("id", memory.preferred_courses);
          preferredCourseTitles = (courses ?? []).map((c) => c.title as string);
        }
        memoryContext = {
          interactionSummary: memory.interaction_summary,
          preferredCourseTitles,
          totalConversations: memory.total_conversations,
        };
      }
    }

    // ------------------------------------------------------------------
    // Persist the user's turn
    // ------------------------------------------------------------------
    await supabase.from("agent_messages").insert({ conversation_id: conversation.id, role: "user", content: message });

    // ------------------------------------------------------------------
    // Tool-calling round(s): let the model decide what to look up/act on
    // ------------------------------------------------------------------
    const knowledgeSourcesUsed: KnowledgeSource[] = [];
    const toolCallResults: { name: string; result: Record<string, unknown>; error: string | null }[] = [];
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    const conversationMessages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt({ channel, conversationState: currentState, knowledgeSources: [], memory: memoryContext, leadStatus: null }) },
      ...(recentMessages ?? []).map((m): ChatMessage => ({ role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "user", content: m.content })),
      { role: "user", content: message },
    ];

    const toolContext: ToolContext = {
      supabase,
      conversationId: conversation.id,
      requestId,
      embed: (text: string) => provider.embed(text),
    };

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const roundResult = await provider.generateStructured({ messages: conversationMessages, tools: TOOL_DEFINITIONS, temperature: 0.3 });
      totalPromptTokens += roundResult.usage.promptTokens;
      totalCompletionTokens += roundResult.usage.completionTokens;

      if (roundResult.toolCalls.length === 0) break;

      for (const call of roundResult.toolCalls as ToolCall[]) {
        const result = await executeToolCall(call, toolContext);
        toolCallResults.push(result);
        if (call.name === "knowledge_search" && !result.error) {
          const sources = (result.result.sources as { document_title: string; document_category: string; content: string; similarity: number }[]) ?? [];
          for (const s of sources) {
            knowledgeSourcesUsed.push({ title: s.document_title, category: s.document_category, content: s.content, similarity: s.similarity });
          }
        }
        conversationMessages.push({ role: "function", name: call.name, content: JSON.stringify(result.error ? { error: result.error } : result.result) });
      }
    }

    // ------------------------------------------------------------------
    // Final structured-output pass: no tools, forced JSON per AGENT_TURN_RESPONSE_SCHEMA
    // ------------------------------------------------------------------
    const finalSystemPrompt = buildSystemPrompt({ channel, conversationState: currentState, knowledgeSources: knowledgeSourcesUsed, memory: memoryContext, leadStatus: conversation.lead_id ? "has_lead" : null });
    const finalMessages: ChatMessage[] = [{ role: "system", content: finalSystemPrompt }, ...conversationMessages.slice(1)];

    const finalResult = await provider.generateStructured({ messages: finalMessages, responseSchema: AGENT_TURN_RESPONSE_SCHEMA, temperature: 0.4 });
    totalPromptTokens += finalResult.usage.promptTokens;
    totalCompletionTokens += finalResult.usage.completionTokens;

    if (finalResult.safetyBlock) {
      log(requestId, "error", "safety_block", { conversationId: conversation.id, block: finalResult.safetyBlock });
      return createResponse(false, "INTERNAL_ERROR", "The response was withheld by safety filters. Please rephrase your message.", null, [finalResult.safetyBlock], 500, requestId);
    }

    let parsed: {
      intents: string[];
      confidence: number;
      conversationState: string;
      entities: Partial<ExtractedEntities>;
      suggestedNextAction: string;
      userFacingResponse: string;
      groundedInKnowledge: boolean;
    };
    try {
      parsed = JSON.parse(finalResult.text);
    } catch {
      log(requestId, "error", "structured_parse_failed", { conversationId: conversation.id, rawText: maskPII(finalResult.text).slice(0, 500) });
      parsed = {
        intents: ["unknown"],
        confidence: 0,
        conversationState: currentState,
        entities: {},
        suggestedNextAction: "Retry or escalate — the model did not return valid structured output.",
        userFacingResponse: "Sorry, I had trouble processing that. Could you rephrase, or would you like to speak with our team?",
        groundedInKnowledge: false,
      };
    }

    // ------------------------------------------------------------------
    // Grounding safeguard: never trust a "grounded" claim with zero sources
    // ------------------------------------------------------------------
    let hallucinationRiskFlagged = false;
    if (parsed.groundedInKnowledge && knowledgeSourcesUsed.length === 0) {
      hallucinationRiskFlagged = true;
      parsed.userFacingResponse = "I don't have confirmed details on that right now — let me have our team follow up with the exact information rather than guess.";
      log(requestId, "error", "hallucination_risk_overridden", { conversationId: conversation.id });
    }

    const primaryIntent: Intent = isIntent(parsed.intents[0] ?? "") ? (parsed.intents[0] as Intent) : "unknown";
    const validIntents = parsed.intents.filter(isIntent) as Intent[];
    const mergedEntities = mergeEntities(collectedEntities, parsed.entities);
    const { state: resolvedState, wasUnexpected } = nextStateOrFallback(currentState, parsed.conversationState);
    const updatedIntentsSeen = Array.from(new Set([...intentsSeen, ...validIntents]));

    const hasContactInfo = Boolean(mergedEntities.email || mergedEntities.phone);
    const { count: userMessageCount } = await supabase
      .from("agent_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id)
      .eq("role", "user");

    const leadScoreResult = scoreLead({
      entities: mergedEntities,
      conversationState: resolvedState,
      intentsSeen: updatedIntentsSeen,
      messageCount: userMessageCount ?? 1,
      hasContactInfo,
    });

    // ------------------------------------------------------------------
    // Persist: assistant message, conversation state, lead score
    // ------------------------------------------------------------------
    const latencyMs = Date.now() - startTime;

    await supabase.from("agent_messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: parsed.userFacingResponse,
      intent: primaryIntent,
      function_call: toolCallResults.length > 0 ? { calls: toolCallResults } : null,
      citations: knowledgeSourcesUsed.map((s) => ({ title: s.title, category: s.category, similarity: s.similarity })),
      tokens_used: totalPromptTokens + totalCompletionTokens,
      latency_ms: latencyMs,
    });

    await supabase
      .from("agent_conversations")
      .update({
        intent: primaryIntent,
        metadata: { conversationState: resolvedState, entities: mergedEntities, intentsSeen: updatedIntentsSeen },
        duration_seconds: Math.round((Date.now() - new Date(conversation.started_at).getTime()) / 1000),
        drop_off_stage: resolvedState === "conversation_end" ? null : resolvedState,
      })
      .eq("id", conversation.id);

    if (conversation.lead_id) {
      const leadUpdates: Record<string, unknown> = { lead_score: leadScoreResult.score };
      if (mergedEntities.city) leadUpdates.city = mergedEntities.city;
      if (mergedEntities.country) leadUpdates.country = mergedEntities.country;
      if (mergedEntities.education) leadUpdates.education = mergedEntities.education;
      if (mergedEntities.experienceYears !== null) leadUpdates.experience_years = mergedEntities.experienceYears;
      if (mergedEntities.careerGoal) leadUpdates.career_goal = mergedEntities.careerGoal;
      if (mergedEntities.timeline) leadUpdates.timeline = mergedEntities.timeline;
      if (mergedEntities.learningMode) leadUpdates.learning_mode = mergedEntities.learningMode;
      if (mergedEntities.budget !== null) leadUpdates.budget = mergedEntities.budget;
      leadUpdates.urgency = leadScoreResult.urgency;
      await supabase.from("leads").update(leadUpdates).eq("id", conversation.lead_id);
    }

    await supabase.from("agent_logs").insert({
      conversation_id: conversation.id,
      event_type: "conversation_turn",
      level: hallucinationRiskFlagged || wasUnexpected ? "warn" : "info",
      source: "converse",
      request_id: requestId,
      payload: {
        promptVersion: PROMPT_VERSION,
        latencyMs,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        toolCallCount: toolCallResults.length,
        toolErrors: toolCallResults.filter((t) => t.error).map((t) => ({ name: t.name, error: t.error })),
        knowledgeSourceCount: knowledgeSourcesUsed.length,
        hallucinationRiskFlagged,
        wasUnexpectedStateTransition: wasUnexpected,
        leadScore: leadScoreResult.score,
      },
    });

    log(requestId, "info", "conversation_turn_completed", { conversationId: conversation.id, latencyMs, leadScore: leadScoreResult.score });

    return createResponse(
      true,
      "OK",
      "OK",
      {
        conversationId: conversation.id,
        detectedIntent: primaryIntent,
        allIntents: validIntents,
        confidence: parsed.confidence,
        conversationState: resolvedState,
        leadScore: leadScoreResult.score,
        extractedEntities: mergedEntities,
        toolCalls: toolCallResults,
        knowledgeSourcesUsed: knowledgeSourcesUsed.map((s) => ({ title: s.title, category: s.category, similarity: s.similarity })),
        suggestedNextAction: parsed.suggestedNextAction,
        userFacingResponse: parsed.userFacingResponse,
        internalMetadata: {
          requestId,
          promptVersion: PROMPT_VERSION,
          latencyMs,
          tokenUsage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, totalTokens: totalPromptTokens + totalCompletionTokens },
          groundedInKnowledge: parsed.groundedInKnowledge,
          hallucinationRiskFlagged,
          wasUnexpectedStateTransition: wasUnexpected,
        },
      },
      [],
      200,
      requestId
    );
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    log(requestId, "error", "fatal_error", { error: errMessage });
    return createResponse(false, "INTERNAL_ERROR", "Internal Server Error", null, [errMessage], 500, requestId);
  }
});
