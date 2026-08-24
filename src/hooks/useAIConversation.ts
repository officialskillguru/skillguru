import { useCallback, useMemo, useRef, useState } from "react";

import {
  resetVisitorId,
  sendAgentMessage,
  type AgentCitation,
  type AgentError,
  type AgentTurn,
} from "@/services/ai-conversation.service";
import type { ConversationState, Intent } from "@/types/ai-agent";
import { useAuth } from "@/hooks/useAuth";

/**
 * One rendered turn in the transcript.
 *
 * `status` exists because a user turn is rendered optimistically the instant it
 * is submitted (a 2-25s round trip is far too long to leave the composer looking
 * inert) and may subsequently fail. A failed user turn stays visible and
 * retryable rather than vanishing, which would lose whatever the visitor typed.
 */
export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status: "sending" | "sent" | "failed";
  citations?: AgentCitation[];
}

export interface UseAIConversationResult {
  messages: TranscriptMessage[];
  send: (text: string) => Promise<void>;
  /** Re-sends the most recent failed user turn. No-op when nothing failed. */
  retry: () => Promise<void>;
  reset: () => void;
  isSending: boolean;
  error: AgentError | null;
  conversationId: string | null;
  conversationState: ConversationState;
  lastIntent: Intent | null;
  /** True once the visitor has been handed to a human or the chat has wrapped up. */
  hasEnded: boolean;
}

const MAX_MESSAGE_LENGTH = 4000;

/**
 * Drives one AI sales-agent chat session.
 *
 * Deliberately not react-query: this is an append-only conversation, not cached
 * server state. There is nothing to invalidate or refetch — replaying a turn
 * would create a second real `agent_messages` row and re-run lead scoring — so a
 * plain state machine models it more honestly than a mutation cache.
 */
export function useAIConversation(): UseAIConversationResult {
  const { user } = useAuth();
  const profileId = user?.id;

  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>("greeting");
  const [lastIntent, setLastIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<AgentError | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Guards against a double-submit (Enter held, or a double click) creating two
  // real conversation turns. A ref rather than `isSending` because state updates
  // are async and both handlers could read the same stale `false`.
  const inFlightRef = useRef(false);
  const lastFailedTextRef = useRef<string | null>(null);

  const deliver = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!trimmed || inFlightRef.current) return;

      inFlightRef.current = true;
      setIsSending(true);
      setError(null);

      const pendingId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: pendingId, role: "user", content: trimmed, createdAt: Date.now(), status: "sending" },
      ]);

      try {
        const result = await sendAgentMessage({
          message: trimmed,
          ...(conversationId ? { conversationId } : {}),
          ...(profileId ? { profileId } : {}),
        });

        if (!result.ok) {
          lastFailedTextRef.current = trimmed;
          setError(result.error);
          setMessages((prev) => prev.map((m) => (m.id === pendingId ? { ...m, status: "failed" } : m)));
          return;
        }

        lastFailedTextRef.current = null;
        applyTurn(result.turn, pendingId);
      } finally {
        inFlightRef.current = false;
        setIsSending(false);
      }

      function applyTurn(turn: AgentTurn, userMessageId: string) {
        setConversationId(turn.conversationId);
        setConversationState(turn.conversationState);
        setLastIntent(turn.detectedIntent);
        setMessages((prev) => [
          ...prev.map((m) => (m.id === userMessageId ? { ...m, status: "sent" as const } : m)),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: turn.userFacingResponse,
            createdAt: Date.now(),
            status: "sent",
            // Only surfaced when the reply was genuinely grounded — showing sources
            // beside an ungrounded answer would imply support the answer does not have.
            citations: turn.internalMetadata.groundedInKnowledge ? turn.knowledgeSourcesUsed : [],
          },
        ]);
      }
    },
    [conversationId, profileId]
  );

  const send = useCallback(
    async (text: string) => {
      await deliver(text);
    },
    [deliver]
  );

  const retry = useCallback(async () => {
    const text = lastFailedTextRef.current;
    if (!text) return;

    // Drop the failed turn before resending so the transcript does not show the
    // same message twice.
    setMessages((prev) => {
      // Manual reverse scan rather than findLastIndex: this project's lib target
      // predates it (TS2550).
      let lastFailedIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        const message = prev[i];
        if (message && message.role === "user" && message.status === "failed") {
          lastFailedIndex = i;
          break;
        }
      }
      return lastFailedIndex === -1 ? prev : prev.filter((_, index) => index !== lastFailedIndex);
    });

    await deliver(text);
  }, [deliver]);

  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setConversationState("greeting");
    setLastIntent(null);
    setError(null);
    lastFailedTextRef.current = null;
    // A new visitor id starts a genuinely separate session server-side, so the
    // previous conversation's memory and rate-limit window do not carry over.
    resetVisitorId();
  }, []);

  const hasEnded = useMemo(
    () => conversationState === "conversation_end" || conversationState === "human_escalation",
    [conversationState]
  );

  return { messages, send, retry, reset, isSending, error, conversationId, conversationState, lastIntent, hasEnded };
}
