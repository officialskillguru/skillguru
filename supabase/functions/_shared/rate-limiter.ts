// ============================================================================
// Rate limiter — Phase 2.3
// ============================================================================
// `converse` is necessarily callable by anonymous visitors (no Supabase JWT),
// unlike the admin-only create-mentor/sync-knowledge-base functions. DB-backed
// rather than in-memory: Edge Function instances are ephemeral/multiplied, so
// an in-memory counter would not actually limit anything across invocations.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_SECONDS = 60;
const MAX_MESSAGES_PER_WINDOW = 20;

export interface RateLimitResult {
  allowed: boolean;
  messagesInWindow: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(supabase: SupabaseClient, visitorId: string): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  const { data: conversations, error: convError } = await supabase
    .from("agent_conversations")
    .select("id")
    .eq("visitor_id", visitorId);
  if (convError) throw new Error("Rate limit check failed (conversations): " + convError.message);

  const conversationIds = (conversations ?? []).map((c) => c.id as string);
  if (conversationIds.length === 0) return { allowed: true, messagesInWindow: 0, retryAfterSeconds: 0 };

  const { count, error: countError } = await supabase
    .from("agent_messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .eq("role", "user")
    .gte("created_at", windowStart);
  if (countError) throw new Error("Rate limit check failed (messages): " + countError.message);

  const messagesInWindow = count ?? 0;
  return {
    allowed: messagesInWindow < MAX_MESSAGES_PER_WINDOW,
    messagesInWindow,
    retryAfterSeconds: messagesInWindow >= MAX_MESSAGES_PER_WINDOW ? WINDOW_SECONDS : 0,
  };
}
