// Gemini embeddings for the knowledge-base sync. Kept out of index.ts (which
// calls Deno.serve on import) so it can be unit-tested.

export const EMBEDDING_DIM = 768;
// text-embedding-004 was retired by Google; gemini-embedding-001 replaces it and
// supports an explicit outputDimensionality so we keep the same 768-dim vectors
// the pgvector HNSW index (agent_knowledge_chunks.embedding) was built for.
export const EMBEDDING_MODEL = "gemini-embedding-001";

/** Removes every occurrence of the key from a message before it can reach logs or the response. */
function redact(message: string, apiKey: string): string {
  return apiKey ? message.split(apiKey).join("[REDACTED]") : message;
}

/**
 * Calls the real Gemini embeddings REST API. Requires GEMINI_API_KEY to be configured as an Edge
 * Function secret (not hardcoded, not passed by the caller). The key travels only in the
 * x-goog-api-key header: Deno's fetch network errors embed the full request URL, and the sync
 * returns error messages to the caller and writes them to logs, so a ?key= URL would leak it.
 */
export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBEDDING_DIM,
      }),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini embedding request failed (network): ${redact(detail, apiKey).slice(0, 300)}`);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embedding request failed (${res.status}): ${redact(body, apiKey).slice(0, 300)}`);
  }

  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIM) {
    throw new Error(`Gemini embedding response had unexpected shape (expected ${EMBEDDING_DIM} dims, got ${Array.isArray(values) ? values.length : typeof values})`);
  }
  return values;
}
