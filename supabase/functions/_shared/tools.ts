// ============================================================================
// Tool framework — Phase 2.3
// ============================================================================
// Every tool is independent: a JSON-schema definition (given to Gemini's
// function-calling) plus a handler function with the same shape. Adding a
// tool later (calendar, payment, notification, n8n trigger, MCP tool) means
// adding one entry to TOOL_DEFINITIONS and one handler here — nothing else
// in the orchestrator changes. Deliberately out of scope for Phase 2.3 (per
// explicit direction that this phase is the reasoning layer, not
// voice/n8n/frontend): calendar booking, payment link generation, SMS,
// outbound email. Those are real integrations this project already has
// providers for (Google Calendar not yet connected; payment via the existing
// PaymentProvider abstraction; notifications via notifications.service.ts) —
// wiring them as tools is Phase 2.4+ work once those provider credentials
// exist, not invented here as fake handlers.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolCall, ToolDefinition } from "./ai-provider-types.ts";

export interface ToolContext {
  supabase: SupabaseClient;
  conversationId: string;
  requestId: string;
  embed: (text: string) => Promise<number[]>;
}

export interface ToolResult {
  name: string;
  result: Record<string, unknown>;
  error: string | null;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "knowledge_search",
    description: "Search the real SkillGuru knowledge base (courses, mentors, testimonials) for facts to ground a response. Always call this before answering any question about courses, pricing, mentors, or policies.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The question or topic to search for." },
        category: { type: "string", description: "Optional filter.", enum: ["course", "mentor", "testimonial", "pricing", "faq", "policy", "general"] },
      },
      required: ["query"],
    },
  },
  {
    name: "create_lead",
    description: "Create a new lead record once the visitor has shared enough to qualify as one (at minimum a name and one contact method). Only call once per conversation.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Visitor's full name." },
        email: { type: "string", description: "Visitor's email, if provided." },
        phone: { type: "string", description: "Visitor's phone, if provided." },
        notes: { type: "string", description: "Short summary of what the visitor is looking for." },
      },
      required: ["name"],
    },
  },
  {
    name: "update_lead",
    description: "Update the lead already created for this conversation with newly learned qualification details.",
    parameters: {
      type: "object",
      properties: {
        budget: { type: "number", description: "Stated budget in INR." },
        priority: { type: "string", description: "Priority level.", enum: ["low", "medium", "high", "urgent"] },
        notes: { type: "string", description: "Additional context to append." },
      },
    },
  },
  {
    name: "escalate_to_human",
    description: "Hand the conversation off to a human team member. Use when the visitor explicitly asks for a human, has a complaint, or the request is outside what you can honestly answer from the knowledge base.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why this conversation needs a human." },
        priority: { type: "string", description: "Priority level.", enum: ["low", "medium", "high", "urgent"] },
      },
      required: ["reason"],
    },
  },
];

async function handleKnowledgeSearch(args: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
  const query = String(args.query ?? "");
  if (!query) throw new Error("knowledge_search requires a query");

  const embedding = await ctx.embed(query);
  const { data, error } = await ctx.supabase.rpc("match_agent_knowledge", {
    query_embedding: JSON.stringify(embedding),
    match_count: 5,
    similarity_threshold: 0.65,
    filter_category: typeof args.category === "string" ? args.category : null,
  });
  if (error) throw new Error("match_agent_knowledge failed: " + error.message);

  return { sources: data ?? [] };
}

async function handleCreateLead(args: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
  const name = String(args.name ?? "").trim();
  if (!name) throw new Error("create_lead requires a name");

  const { data: conversation, error: convError } = await ctx.supabase
    .from("agent_conversations")
    .select("lead_id")
    .eq("id", ctx.conversationId)
    .single();
  if (convError) throw new Error("Failed to load conversation: " + convError.message);
  if (conversation?.lead_id) return { leadId: conversation.lead_id, alreadyExisted: true };

  const { data: lead, error: leadError } = await ctx.supabase
    .from("leads")
    .insert({
      name,
      email: typeof args.email === "string" ? args.email : null,
      phone: typeof args.phone === "string" ? args.phone : null,
      notes: typeof args.notes === "string" ? args.notes : null,
      status: "new",
      priority: "medium",
      agent_conversation_id: ctx.conversationId,
    })
    .select("id")
    .single();
  if (leadError || !lead) throw new Error("Failed to create lead: " + (leadError?.message ?? "no row returned"));

  await ctx.supabase.from("lead_activities").insert({
    lead_id: lead.id,
    action: "ai_agent_created",
    details: { conversationId: ctx.conversationId, requestId: ctx.requestId },
  });

  await ctx.supabase.from("agent_conversations").update({ lead_id: lead.id }).eq("id", ctx.conversationId);

  return { leadId: lead.id, alreadyExisted: false };
}

async function handleUpdateLead(args: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
  const { data: conversation, error: convError } = await ctx.supabase
    .from("agent_conversations")
    .select("lead_id")
    .eq("id", ctx.conversationId)
    .single();
  if (convError) throw new Error("Failed to load conversation: " + convError.message);
  if (!conversation?.lead_id) throw new Error("update_lead called before create_lead — no lead exists for this conversation yet");

  const updates: Record<string, unknown> = {};
  if (typeof args.budget === "number") updates.budget = args.budget;
  if (typeof args.priority === "string") updates.priority = args.priority;
  if (typeof args.notes === "string") updates.notes = args.notes;
  if (Object.keys(updates).length === 0) return { leadId: conversation.lead_id, updated: false };

  const { error: updateError } = await ctx.supabase.from("leads").update(updates).eq("id", conversation.lead_id);
  if (updateError) throw new Error("Failed to update lead: " + updateError.message);

  await ctx.supabase.from("lead_activities").insert({
    lead_id: conversation.lead_id,
    action: "ai_agent_updated",
    details: { conversationId: ctx.conversationId, requestId: ctx.requestId, updates },
  });

  return { leadId: conversation.lead_id, updated: true };
}

async function handleEscalateToHuman(args: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
  const reason = String(args.reason ?? "Escalation requested");
  const priority = typeof args.priority === "string" ? args.priority : "medium";

  const { data: conversation, error: convError } = await ctx.supabase
    .from("agent_conversations")
    .select("profile_id")
    .eq("id", ctx.conversationId)
    .single();
  if (convError) throw new Error("Failed to load conversation: " + convError.message);

  const { data: ticket, error: ticketError } = await ctx.supabase
    .from("support_tickets")
    .insert({
      student_id: conversation?.profile_id ?? null,
      category: "ai_escalation",
      priority,
      status: "open",
      title: "AI agent escalation",
      description: `${reason}\n\nConversation: ${ctx.conversationId}`,
    })
    .select("id")
    .single();
  if (ticketError || !ticket) throw new Error("Failed to create escalation ticket: " + (ticketError?.message ?? "no row returned"));

  await ctx.supabase
    .from("agent_conversations")
    .update({ status: "escalated", escalated_at: new Date().toISOString() })
    .eq("id", ctx.conversationId);

  return { ticketId: ticket.id, escalated: true };
}

const HANDLERS: Record<string, (args: Record<string, unknown>, ctx: ToolContext) => Promise<Record<string, unknown>>> = {
  knowledge_search: handleKnowledgeSearch,
  create_lead: handleCreateLead,
  update_lead: handleUpdateLead,
  escalate_to_human: handleEscalateToHuman,
};

export async function executeToolCall(call: ToolCall, ctx: ToolContext): Promise<ToolResult> {
  const handler = HANDLERS[call.name];
  if (!handler) return { name: call.name, result: {}, error: `Unknown tool: ${call.name}` };

  try {
    const result = await handler(call.arguments, ctx);
    return { name: call.name, result, error: null };
  } catch (err) {
    return { name: call.name, result: {}, error: err instanceof Error ? err.message : String(err) };
  }
}
