import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type ResponseCode = "OK" | "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "MISSING_EMBEDDING_KEY" | "INTERNAL_ERROR";

const createResponse = (
  success: boolean,
  code: ResponseCode,
  message: string,
  data: unknown = null,
  errors: unknown[] = [],
  status: number = 200,
  requestId: string = crypto.randomUUID()
) => {
  return new Response(
    JSON.stringify({ success, code, message, data, errors, meta: { requestId, timestamp: new Date().toISOString(), version: "v1" } }),
    { status, headers: corsHeaders }
  );
};

function log(requestId: string, level: "info" | "error", event: string, extra: Record<string, unknown> = {}) {
  const entry = { requestId, level, event, ...extra, timestamp: new Date().toISOString() };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

const EMBEDDING_DIM = 768;
// text-embedding-004 was retired by Google; gemini-embedding-001 replaces it and
// supports an explicit outputDimensionality so we keep the same 768-dim vectors
// the pgvector HNSW index (agent_knowledge_chunks.embedding) was built for.
const EMBEDDING_MODEL = "gemini-embedding-001";

/** Splits content into ~maxChars chunks on paragraph boundaries where possible, with a small overlap so semantic context isn't cut off mid-thought. Short content (the common case here) returns a single chunk. */
function chunkText(text: string, maxChars = 1000, overlap = 100): string[] {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean.length > 0 ? [clean] : [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current.length > 0) {
      chunks.push(current);
      current = current.slice(Math.max(0, current.length - overlap)) + "\n\n" + para;
    } else {
      current = current.length > 0 ? current + "\n\n" + para : para;
    }
  }
  if (current.trim().length > 0) chunks.push(current);

  // Fallback: a single huge paragraph with no breaks -- hard-split by character count.
  if (chunks.length === 0) {
    for (let i = 0; i < clean.length; i += maxChars - overlap) {
      chunks.push(clean.slice(i, i + maxChars));
    }
  }
  return chunks;
}

/** Calls the real Gemini embeddings REST API. Requires GEMINI_API_KEY to be configured as an Edge Function secret (not hardcoded, not passed by the caller). */
async function embedText(text: string, apiKey: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIM,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embedding request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIM) {
    throw new Error(`Gemini embedding response had unexpected shape (expected ${EMBEDDING_DIM} dims, got ${Array.isArray(values) ? values.length : typeof values})`);
  }
  return values;
}

interface SourceDocument {
  sourceTable: string;
  sourceId: string;
  title: string;
  category: "course" | "mentor" | "testimonial";
  content: string;
}

async function buildCourseDocuments(supabase: SupabaseClient): Promise<SourceDocument[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, description, level, duration, price, mentor:mentor_profiles(headline, profile:profiles(full_name))")
    .is("deleted_at", null)
    .eq("status", "published");
  if (error) throw new Error("Failed to fetch courses: " + error.message);

  return (courses ?? []).map((c: Record<string, unknown>) => {
    const mentor = c.mentor as { headline: string | null; profile: { full_name: string | null } | null } | null;
    const mentorName = mentor?.profile?.full_name;
    const lines = [
      `Course: ${c.title}`,
      c.description ? `Description: ${c.description}` : null,
      c.level ? `Level: ${c.level}` : null,
      c.duration ? `Duration: ${c.duration}` : null,
      typeof c.price === "number" || typeof c.price === "string" ? `Price: ${Number(c.price) > 0 ? `₹${c.price}` : "Free"}` : null,
      mentorName ? `Mentor: ${mentorName}${mentor?.headline ? ` (${mentor.headline})` : ""}` : null,
    ].filter(Boolean);

    return {
      sourceTable: "courses",
      sourceId: c.id as string,
      title: c.title as string,
      category: "course" as const,
      content: lines.join("\n"),
    };
  });
}

async function buildMentorDocuments(supabase: SupabaseClient): Promise<SourceDocument[]> {
  const { data: mentors, error } = await supabase
    .from("mentor_profiles")
    .select("id, headline, bio, expertise, years_of_experience, company, profile:profiles(full_name)");
  if (error) throw new Error("Failed to fetch mentors: " + error.message);

  return (mentors ?? [])
    .filter((m: Record<string, unknown>) => (m.profile as { full_name: string | null } | null)?.full_name)
    .map((m: Record<string, unknown>) => {
      const profile = m.profile as { full_name: string | null };
      const expertise = Array.isArray(m.expertise) ? (m.expertise as string[]).join(", ") : null;
      const lines = [
        `Mentor: ${profile.full_name}`,
        m.headline ? `Headline: ${m.headline}` : null,
        m.company ? `Company: ${m.company}` : null,
        m.years_of_experience ? `Experience: ${m.years_of_experience} years` : null,
        expertise ? `Expertise: ${expertise}` : null,
        m.bio ? `Bio: ${m.bio}` : null,
      ].filter(Boolean);

      return {
        sourceTable: "mentor_profiles",
        sourceId: m.id as string,
        title: `Mentor: ${profile.full_name}`,
        category: "mentor" as const,
        content: lines.join("\n"),
      };
    });
}

async function buildTestimonialDocuments(supabase: SupabaseClient): Promise<SourceDocument[]> {
  const { data: testimonials, error } = await supabase
    .from("testimonials")
    .select("id, content, rating, course:courses(title), student:profiles(full_name)")
    .eq("is_approved", true);
  if (error) throw new Error("Failed to fetch testimonials: " + error.message);

  return (testimonials ?? [])
    .filter((t: Record<string, unknown>) => t.content)
    .map((t: Record<string, unknown>) => {
      const course = t.course as { title: string | null } | null;
      const student = t.student as { full_name: string | null } | null;
      const lines = [
        student?.full_name ? `Student: ${student.full_name}` : null,
        course?.title ? `Course: ${course.title}` : null,
        t.rating ? `Rating: ${t.rating}/5` : null,
        `Testimonial: ${t.content}`,
      ].filter(Boolean);

      return {
        sourceTable: "testimonials",
        sourceId: t.id as string,
        title: `Testimonial${student?.full_name ? `: ${student.full_name}` : ""}`,
        category: "testimonial" as const,
        content: lines.join("\n"),
      };
    });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error("Missing Supabase configuration");

    if (!geminiApiKey) {
      return createResponse(
        false,
        "MISSING_EMBEDDING_KEY",
        "GEMINI_API_KEY is not configured as an Edge Function secret. Set it with `supabase secrets set GEMINI_API_KEY=...` (use a freshly rotated key, never one that was ever pasted into chat) and redeploy.",
        null,
        [],
        500,
        requestId
      );
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) return createResponse(false, "UNAUTHORIZED", "Unauthorized", null, ["Missing authorization header"], 401, requestId);

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userResp, error: userError } = await callerClient.auth.getUser();
    if (userError || !userResp.user) return createResponse(false, "UNAUTHORIZED", "Unauthorized caller", null, [userError?.message], 401, requestId);

    const { data: callerRoles, error: roleError } = await callerClient.rpc("get_current_roles");
    if (roleError || !callerRoles || (!callerRoles.includes("admin") && !callerRoles.includes("super_admin"))) {
      return createResponse(false, "FORBIDDEN", "Forbidden", null, ["Only admins can sync the knowledge base"], 403, requestId);
    }

    const bodySchema = z.object({
      sources: z.array(z.enum(["courses", "mentors", "testimonials"])).default(["courses", "mentors", "testimonials"]),
    });
    const rawBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) return createResponse(false, "VALIDATION_ERROR", "Validation failed", null, parseResult.error.errors, 400, requestId);
    const { sources } = parseResult.data;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const documents: SourceDocument[] = [];
    if (sources.includes("courses")) documents.push(...(await buildCourseDocuments(serviceClient)));
    if (sources.includes("mentors")) documents.push(...(await buildMentorDocuments(serviceClient)));
    if (sources.includes("testimonials")) documents.push(...(await buildTestimonialDocuments(serviceClient)));

    log(requestId, "info", "sync_started", { sources, documentCount: documents.length });

    let documentsUpserted = 0;
    let chunksEmbedded = 0;
    const errors: { sourceTable: string; sourceId: string; message: string }[] = [];

    for (const doc of documents) {
      try {
        const { data: docRow, error: docError } = await serviceClient
          .from("agent_knowledge_documents")
          .upsert(
            {
              title: doc.title,
              category: doc.category,
              content: doc.content,
              source_table: doc.sourceTable,
              source_id: doc.sourceId,
              is_active: true,
            },
            { onConflict: "source_table,source_id" }
          )
          .select("id")
          .single();
        if (docError || !docRow) throw new Error(docError?.message ?? "Document upsert returned no row");

        // Re-chunk from scratch on every sync: simplest correct approach given
        // the small corpus size here, and avoids drift between stale chunks
        // and updated source content.
        await serviceClient.from("agent_knowledge_chunks").delete().eq("document_id", docRow.id);

        const chunks = chunkText(doc.content);
        for (let i = 0; i < chunks.length; i++) {
          const embedding = await embedText(chunks[i], geminiApiKey);
          const { error: chunkError } = await serviceClient.from("agent_knowledge_chunks").insert({
            document_id: docRow.id,
            chunk_index: i,
            content: chunks[i],
            token_count: Math.ceil(chunks[i].length / 4),
            embedding: JSON.stringify(embedding),
          });
          if (chunkError) throw new Error("Chunk insert failed: " + chunkError.message);
          chunksEmbedded++;
        }

        documentsUpserted++;
      } catch (docErr) {
        const message = docErr instanceof Error ? docErr.message : String(docErr);
        errors.push({ sourceTable: doc.sourceTable, sourceId: doc.sourceId, message });
        log(requestId, "error", "document_sync_failed", { sourceTable: doc.sourceTable, sourceId: doc.sourceId, error: message });
      }
    }

    await serviceClient.from("agent_logs").insert({
      event_type: "knowledge_sync",
      level: errors.length > 0 ? "warn" : "info",
      source: "sync-knowledge-base",
      request_id: requestId,
      payload: { sources, documentsFound: documents.length, documentsUpserted, chunksEmbedded, errorCount: errors.length },
    });

    log(requestId, "info", "sync_completed", { documentsUpserted, chunksEmbedded, errorCount: errors.length });

    return createResponse(
      errors.length === 0,
      "OK",
      `Synced ${documentsUpserted}/${documents.length} documents, embedded ${chunksEmbedded} chunks.`,
      { documentsFound: documents.length, documentsUpserted, chunksEmbedded, errors },
      [],
      200,
      requestId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(requestId, "error", "fatal_error", { error: message });
    return createResponse(false, "INTERNAL_ERROR", "Internal Server Error", null, [message], 500, requestId);
  }
});
