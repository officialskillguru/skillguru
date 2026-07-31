import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";

export type SuccessStory = {
  id: number;
  title: string;
  job_role: string | null;
  company_name: string | null;
  image_url: string | null;
  full_story: string | null;
  package: string | null;
  published: boolean;
  featured: boolean;
  created_at: string;
};

export type SuccessStoryListParams = ListParams & {
  published?: boolean | "all";
  featured?: boolean;
};

export async function listSuccessStories(params: SuccessStoryListParams = {}): Promise<PaginatedResult<SuccessStory>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);

  let query = supabase.from("success_stories").select("*", { count: "exact" });

  if (params.published !== undefined && params.published !== "all") {
    query = query.eq("published", params.published);
  }
  if (params.featured !== undefined) {
    query = query.eq("featured", params.featured);
  }
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,company_name.ilike.%${params.search}%,job_role.ilike.%${params.search}%`);
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

export async function createSuccessStory(input: Partial<SuccessStory>) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("success_stories").insert(input as { title: string }).select().single();
  assertServiceResponse(error);
  return data;
}

export async function updateSuccessStory(id: number, input: Partial<SuccessStory>) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("success_stories").update(input).eq("id", id).select().single();
  assertServiceResponse(error);
  return data;
}

export async function deleteSuccessStory(id: number) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("success_stories").delete().eq("id", id);
  assertServiceResponse(error);
}

export async function setSuccessStoryStatus(id: number, published: boolean) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("success_stories").update({ published }).eq("id", id).select().single();
  assertServiceResponse(error);
  return data;
}
