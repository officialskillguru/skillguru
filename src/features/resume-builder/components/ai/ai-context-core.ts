// Context + hook for the editor's AI features (provider lives in ai-context.tsx).
import { createContext, useContext } from "react";

export type AiContextValue = {
  resumeId: string;
  targetRole: string;
  /** Resolves true if the student has accepted the AI notice (asks once). */
  ensureConsent: () => Promise<boolean>;
  /** Saves pending edits so server-side operations see the latest text. */
  ensureSaved: () => Promise<boolean>;
};

export const AiContext = createContext<AiContextValue | null>(null);

export function useAiContext(): AiContextValue {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAiContext must be used inside <ResumeAiProvider>");
  return ctx;
}
