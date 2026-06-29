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

export type Course = Tables<"courses">;
export type CourseCategory = Tables<"course_categories">;
export type CourseInput = Omit<Inserts<"courses">, "slug"> & { slug?: string };
export type CourseListParams = ListParams & {
  status?: ContentStatus | "all";
  categoryId?: string;
  featured?: boolean;
};

export async function listCourses(params: CourseListParams = {}): Promise<PaginatedResult<Course>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);
  const sortBy = params.sortBy ?? "updated_at";
  const ascending = params.sortDirection === "asc";

  let query = supabase.from("courses").select("*", { count: "exact" });

  if (search) {
    query = query.or(`title.ilike.${search},slug.ilike.${search},summary.ilike.${search}`);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.categoryId) {
    query = query.eq("category_id", params.categoryId);
  }

  if (typeof params.featured === "boolean") {
    query = query.eq("is_featured", params.featured);
  }

  const { data, error, count } = await query.order(sortBy, { ascending }).range(from, to);
  assertServiceResponse(error);

  return { data: data ?? [], count: count ?? 0, page, pageSize };
}

export async function listCourseCategories() {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("course_categories").select("*").order("sort_order", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function getCourseBySlug(slug: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("courses").select("*").eq("slug", slug).single();
  assertServiceResponse(error);
  return data;
}

export async function createCourse(input: CourseInput) {
  const supabase = getSupabaseClientOrThrow();
  const slug = input.slug ? createSlug(input.slug) : createSlug(input.title || "");
  const isPublished = input.status === "published" || input.is_published === true;
  const payload: Inserts<"courses"> = {
    ...input,
    slug,
    is_published: isPublished,
    is_featured: input.is_featured ?? false,
  };
  const { data, error } = await supabase.from("courses").insert(payload).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateCourse(id: string, input: Updates<"courses">) {
  const supabase = getSupabaseClientOrThrow();
  const nextInput: Updates<"courses"> = {
    ...input,
    ...(input.slug ? { slug: createSlug(input.slug) } : {}),
    ...(input.status ? { is_published: input.status === "published" } : {}),
  };
  const { data, error } = await supabase.from("courses").update(nextInput).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateCourseStatus(id: string, status: ContentStatus) {
  return updateCourse(id, { status, is_published: status === "published" });
}

export async function deleteCourse(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  assertServiceResponse(error);
}
