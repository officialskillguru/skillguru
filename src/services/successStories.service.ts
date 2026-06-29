// Remove this directive after running `supabase gen types` to sync database schema.
import { createSlug } from "@/lib/slug";
import type { ContentStatus, Inserts, Tables, Updates } from "@/types/database";

import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";

export type SuccessStory = Tables<"success_stories">;
export type SuccessStoryInput = Omit<Inserts<"success_stories">, "slug" | "full_name" | "story"> &
  Pick<Partial<Inserts<"success_stories">>, "slug" | "full_name" | "story"> & {
    student_name: string;
    testimonial: string;
  };

export type SuccessStoryListParams = ListParams & {
  status?: ContentStatus | "all";
  featured?: boolean;
};

export async function listSuccessStories(params: SuccessStoryListParams = {}): Promise<PaginatedResult<SuccessStory>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  let query = supabase.from("success_stories").select("*", { count: "exact" });

  if (search) {
    query = query.or(`student_name.ilike.${search},full_name.ilike.${search},course_name.ilike.${search},company_name.ilike.${search}`);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (typeof params.featured === "boolean") {
    query = query.eq("featured", params.featured);
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize };
}

export async function createSuccessStory(input: SuccessStoryInput) {
  const supabase = getSupabaseClientOrThrow();
  const studentName = input.student_name;
  const testimonial = input.testimonial;
  const payload: Inserts<"success_stories"> = {
    ...input,
    full_name: input.full_name ?? studentName,
    story: input.story ?? testimonial,
    slug: input.slug ? createSlug(input.slug) : createSlug(studentName, input.company_name ?? "success"),
    is_published: input.status === "published",
  };
  const { data, error } = await supabase.from("success_stories").insert(payload).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateSuccessStory(id: string, input: Updates<"success_stories">) {
  const supabase = getSupabaseClientOrThrow();
  const payload: Updates<"success_stories"> = {
    ...input,
    ...(input.slug ? { slug: createSlug(input.slug) } : {}),
    ...(input.status ? { is_published: input.status === "published" } : {}),
  };
  const { data, error } = await supabase.from("success_stories").update(payload).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function setSuccessStoryStatus(id: string, status: ContentStatus) {
  return updateSuccessStory(id, { status, is_published: status === "published" });
}

export async function featureSuccessStory(id: string, featured: boolean) {
  return updateSuccessStory(id, { featured });
}

export async function deleteSuccessStory(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("success_stories").delete().eq("id", id);
  assertServiceResponse(error);
}
