// ============================================================================
// AI Provider abstraction — Phase 2.3
// ============================================================================
// WHY: the conversation orchestrator must never call a specific vendor SDK
// directly. Every provider (Gemini today; OpenAI/Claude/local later) is a
// pure implementation of this interface, selected by ai-provider-factory.ts.
// This mirrors the existing PaymentProvider pattern in this codebase
// (payment.service.ts / MockPaymentProvider / RazorpayProvider).
// ============================================================================

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  /** Present only on role: "function" messages — the tool call this is a result for. */
  name?: string;
}

export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, { type: string; description: string; enum?: string[] }>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface StructuredGenerationRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  /** JSON Schema the final text response must conform to, if this call should return structured JSON rather than free text. */
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface StructuredGenerationResult {
  /** Free-text or JSON-stringified response, depending on whether responseSchema was set. */
  text: string;
  toolCalls: ToolCall[];
  finishReason: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  /** Provider-reported safety block, if the response was withheld. Null when nothing was blocked. */
  safetyBlock: string | null;
}

export interface AIProvider {
  readonly name: string;
  generateStructured(request: StructuredGenerationRequest): Promise<StructuredGenerationResult>;
  embed(text: string): Promise<number[]>;
}

/** Every provider call in the orchestrator goes through this shape so telemetry/logging code never needs to know which provider ran. */
export interface ProviderCallTelemetry {
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  retryCount: number;
  succeeded: boolean;
  errorMessage: string | null;
}
