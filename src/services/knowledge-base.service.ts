import { assertServiceResponse, getSupabaseClientOrThrow, paginationRange, type ListParams, type PaginatedResult } from "./_shared";
import type { Tables } from "@/types/database";

export type KnowledgeDocument = Tables<"agent_knowledge_documents">;

export type KnowledgeDocumentListParams = ListParams & {
  category?: KnowledgeDocument["category"];
};

export async function listKnowledgeDocuments(params: KnowledgeDocumentListParams = {}): Promise<PaginatedResult<KnowledgeDocument>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);

  let query = supabase.from("agent_knowledge_documents").select("*", { count: "exact" }).is("deleted_at", null);
  if (params.category) query = query.eq("category", params.category);
  if (params.search) query = query.ilike("title", `%${params.search}%`);

  const { data, error, count } = await query.order("updated_at", { ascending: false }).range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

export async function getKnowledgeBaseStats(): Promise<{ documentCount: number; chunkCount: number; byCategory: Record<string, number> }> {
  const supabase = getSupabaseClientOrThrow();

  const { count: documentCount, error: docError } = await supabase
    .from("agent_knowledge_documents")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  assertServiceResponse(docError);

  const { count: chunkCount, error: chunkError } = await supabase
    .from("agent_knowledge_chunks")
    .select("id", { count: "exact", head: true });
  assertServiceResponse(chunkError);

  const { data: categoryRows, error: categoryError } = await supabase
    .from("agent_knowledge_documents")
    .select("category")
    .is("deleted_at", null);
  assertServiceResponse(categoryError);

  const byCategory: Record<string, number> = {};
  for (const row of categoryRows ?? []) {
    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
  }

  return { documentCount: documentCount ?? 0, chunkCount: chunkCount ?? 0, byCategory };
}

export async function setKnowledgeDocumentActive(id: string, isActive: boolean): Promise<void> {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("agent_knowledge_documents").update({ is_active: isActive }).eq("id", id);
  assertServiceResponse(error);
}

export interface KnowledgeSyncResult {
  success: boolean;
  message: string;
  data: {
    documentsFound: number;
    documentsUpserted: number;
    chunksEmbedded: number;
    errors: { sourceTable: string; sourceId: string; message: string }[];
  } | null;
}

export type KnowledgeSyncSource = "courses" | "mentors" | "testimonials";

export async function syncKnowledgeBase(sources?: KnowledgeSyncSource[]): Promise<KnowledgeSyncResult> {
  const supabase = getSupabaseClientOrThrow();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<KnowledgeSyncResult>("sync-knowledge-base", {
    body: sources ? { sources } : {},
  });
  if (error) throw error;
  if (!data) throw new Error("sync-knowledge-base returned no response");
  return data;
}
