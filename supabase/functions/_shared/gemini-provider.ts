// ============================================================================
// GeminiProvider — Phase 2.3
// ============================================================================
// The only file in this feature that knows Gemini's REST shape. Everything
// else in the orchestrator talks to the AIProvider interface. Swapping in a
// different vendor later means writing one new file here, not touching the
// orchestrator/prompt-manager/tools/state-machine at all.
// ============================================================================

import type { AIProvider, ChatMessage, StructuredGenerationRequest, StructuredGenerationResult, ToolCall } from "./ai-provider-types.ts";

// text-embedding-004 was retired by Google; gemini-embedding-001 replaces it and
// supports an explicit outputDimensionality so we keep the same 768-dim vectors
// the pgvector HNSW index (agent_knowledge_chunks.embedding) was built for.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
}

interface GeminiCandidate {
  content?: { parts: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
}

function toGeminiContents(messages: ChatMessage[]): { role: "user" | "model"; parts: GeminiPart[] }[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

async function fetchWithRetryAndTimeout(url: string, body: unknown, timeoutMs: number, maxAttempts: number): Promise<GeminiResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Gemini returned ${res.status}: ${await res.text().catch(() => "")}`);
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
          continue;
        }
        throw lastError;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 500)}`);
      }

      return (await res.json()) as GeminiResponse;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (attempt < maxAttempts - 1 && (isAbort || err instanceof TypeError)) {
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
        continue;
      }
      throw isAbort ? new Error(`Gemini request timed out after ${timeoutMs}ms`) : err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini request failed after retries");
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(apiKey: string, model = "gemini-flash-latest", timeoutMs = 15000, maxAttempts = 3) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.maxAttempts = maxAttempts;
  }

  async generateStructured(request: StructuredGenerationRequest): Promise<StructuredGenerationResult> {
    const systemMessage = request.messages.find((m) => m.role === "system");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body: Record<string, unknown> = {
      contents: toGeminiContents(request.messages),
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: request.temperature ?? 0.4,
        maxOutputTokens: request.maxOutputTokens ?? 1024,
        ...(request.responseSchema ? { responseMimeType: "application/json", responseSchema: request.responseSchema } : {}),
      },
    };
    if (systemMessage) body.systemInstruction = { parts: [{ text: systemMessage.content }] };
    if (request.tools && request.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const json = await fetchWithRetryAndTimeout(url, body, this.timeoutMs, this.maxAttempts);

    if (json.promptFeedback?.blockReason) {
      return {
        text: "",
        toolCalls: [],
        finishReason: "SAFETY",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        safetyBlock: json.promptFeedback.blockReason,
      };
    }

    const candidate = json.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const textParts = parts.filter((p): p is { text: string } => typeof p.text === "string").map((p) => p.text);
    const toolCalls: ToolCall[] = parts
      .filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } => Boolean(p.functionCall))
      .map((p) => ({ name: p.functionCall.name, arguments: p.functionCall.args }));

    return {
      text: textParts.join(""),
      toolCalls,
      finishReason: candidate?.finishReason ?? "UNKNOWN",
      usage: {
        promptTokens: json.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: json.usageMetadata?.totalTokenCount ?? 0,
      },
      safetyBlock: candidate?.finishReason === "SAFETY" ? "SAFETY" : null,
    };
  }

  async embed(text: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: `models/${EMBEDDING_MODEL}`, content: { parts: [{ text }] }, taskType: "RETRIEVAL_QUERY", outputDimensionality: EMBEDDING_DIM }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini embedding request failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = await res.json();
    const values = json?.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIM) {
      throw new Error(`Gemini embedding response had unexpected shape (expected ${EMBEDDING_DIM} dims)`);
    }
    return values;
  }
}
