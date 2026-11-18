import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { deriveSaraswatiState, type SaraswatiState } from "./saraswati-state";
import { fetchSignedUrl, SaraswatiConnectionError } from "./saraswati.service";

export interface SaraswatiLine {
  id: number;
  role: "user" | "agent";
  text: string;
}

export interface UseSaraswatiResult {
  state: SaraswatiState;
  isActive: boolean;
  errorMessage: string | null;
  lines: SaraswatiLine[];
  start: () => Promise<void>;
  stop: () => void;
  /** Sends a typed message into the live session (non-voice input). */
  sendText: (text: string) => void;
  /** Live speech loudness (0–1) for lip-sync. A stable function, safe to call every frame. */
  getOutputVolume: () => number;
}

const MAX_LINES = 30;

/**
 * Wraps the ElevenLabs React SDK for Saraswati. Must be rendered inside
 * `<ConversationProvider>`. Uses only ElevenLabs — no Gemini or Supabase.
 */
export function useSaraswati(): UseSaraswatiResult {
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [lines, setLines] = useState<SaraswatiLine[]>([]);
  const startingRef = useRef(false);

  const conversation = useConversation({
    onMessage: ({ message, role, event_id }) => {
      if (!message?.trim()) return;
      // A final user transcript means the agent is now composing a reply.
      setAwaitingReply(role === "user");
      setLines((prev) => [...prev, { id: event_id ?? Date.now(), role, text: message }].slice(-MAX_LINES));
    },
    onModeChange: ({ mode }) => {
      if (mode === "speaking") setAwaitingReply(false);
    },
    onError: (message) => {
      setLocalError(typeof message === "string" && message ? message : "The voice session ended unexpectedly.");
    },
    onDisconnect: () => setAwaitingReply(false),
  });

  // Keep the latest SDK accessor behind a ref so the per-frame reader stays stable.
  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  });

  const getOutputVolume = useCallback(() => {
    try {
      return conversationRef.current.status === "connected" ? conversationRef.current.getOutputVolume() : 0;
    } catch {
      return 0;
    }
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current) return;
    const status = conversationRef.current.status;
    if (status === "connected" || status === "connecting") return;
    startingRef.current = true;
    setLocalError(null);
    setAwaitingReply(false);
    try {
      // Ask for the mic first so a denial produces a clear message instead of a dropped socket.
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
      const signedUrl = await fetchSignedUrl();
      conversationRef.current.startSession({ signedUrl, connectionType: "websocket" });
    } catch (err) {
      if (err instanceof SaraswatiConnectionError) setLocalError(err.message);
      else if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError"))
        setLocalError("Microphone access is blocked. Allow the microphone in your browser to talk with Saraswati.");
      else if (err instanceof DOMException && err.name === "NotFoundError") setLocalError("No microphone was found on this device.");
      else setLocalError("Saraswati couldn't start. Please try again.");
    } finally {
      startingRef.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    setAwaitingReply(false);
    try {
      conversationRef.current.endSession();
    } catch {
      // Already disconnected.
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (conversationRef.current.status !== "connected") return;
    setLines((prev) => [...prev, { id: Date.now(), role: "user" as const, text }].slice(-MAX_LINES));
    setAwaitingReply(true);
    conversationRef.current.sendUserMessage(text);
  }, []);

  const state = deriveSaraswatiState({
    status: conversation.status,
    mode: conversation.mode,
    awaitingReply,
    localError: Boolean(localError),
  });

  return useMemo(
    () => ({
      state,
      isActive: conversation.status === "connected" || conversation.status === "connecting",
      errorMessage: localError ?? (conversation.status === "error" ? (conversation.message ?? "The voice session failed.") : null),
      lines,
      start,
      stop,
      sendText,
      getOutputVolume,
    }),
    [state, conversation.status, conversation.message, localError, lines, start, stop, sendText, getOutputVolume],
  );
}
