// ============================================================================
// AIProvider factory — Phase 2.3
// ============================================================================
// Single place that knows how to construct a concrete provider. Adding a new
// vendor later means adding one branch here, not touching the orchestrator.
// ============================================================================

import type { AIProvider } from "./ai-provider-types.ts";
import { GeminiProvider } from "./gemini-provider.ts";

export type SupportedProvider = "gemini";

export function createAIProvider(provider: SupportedProvider, apiKey: string, model?: string): AIProvider {
  switch (provider) {
    case "gemini":
      return new GeminiProvider(apiKey, model);
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported AI provider: ${String(exhaustive)}`);
    }
  }
}
