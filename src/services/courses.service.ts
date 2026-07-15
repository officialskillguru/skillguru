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
export type CourseInput = Omit<Inserts<"courses">, "slug"> & { slug?: string; selectedCategoryIds?: string[] };
export type CourseListParams = ListParams & {
  status?: ContentStatus | "all";
  categoryId?: string;
  featured?: boolean;
};

export type CourseWithCategories = Course & { selectedCategoryIds?: string[] };

export async function listCourses(params: CourseListParams = {}): Promise<PaginatedResult<CourseWithCategories>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);
  const sortBy = params.sortBy ?? "updated_at";
  const ascending = params.sortDirection === "asc";

  let query = supabase.from("courses").select("*, course_categories!inner(category_id)", { count: "exact" });

  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%,short_description.ilike.%${search}%`);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.categoryId) {
    query = query.eq("course_categories.category_id", params.categoryId);
  }

  const { data, error, count } = await query
    .order(sortBy, { ascending })
    .range(from, to)
    .returns<(Course & { course_categories: { category_id: string }[] })[]>();
  assertServiceResponse(error);

  const mappedData: CourseWithCategories[] = (data ?? []).map(course => {
    const { course_categories, ...rest } = course;
    return {
      ...rest,
      selectedCategoryIds: (course_categories || []).map(cc => cc.category_id)
    };
  });

  return { data: mappedData, count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

export async function listCourseCategories() {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
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
  const { selectedCategoryIds, ...rest } = input;
  const payload: Inserts<"courses"> = {
    ...rest,
    slug,
  };
  const { data, error } = await supabase.from("courses").insert(payload).select("*").single();
  assertServiceResponse(error);
  
  if (data && selectedCategoryIds && selectedCategoryIds.length > 0) {
    const categoriesData = selectedCategoryIds.map(catId => ({
      course_id: data.id,
      category_id: catId
    }));
    await supabase.from("course_categories").upsert(categoriesData);
  }
  
  return data;
}

export async function updateCourse(id: string, input: Updates<"courses"> & { selectedCategoryIds?: string[] }) {
  const supabase = getSupabaseClientOrThrow();
  const { selectedCategoryIds, ...rest } = input;
  const nextInput: Updates<"courses"> = {
    ...rest,
    ...(rest.slug ? { slug: createSlug(rest.slug) } : {}),
  };
  const { data, error } = await supabase.from("courses").update(nextInput).eq("id", id).select("*").single();
  assertServiceResponse(error);
  
  if (data && selectedCategoryIds) {
    // Delete old categories and insert new ones
    await supabase.from("course_categories").delete().eq("course_id", id);
    if (selectedCategoryIds.length > 0) {
      const categoriesData = selectedCategoryIds.map(catId => ({
        course_id: id,
        category_id: catId
      }));
      await supabase.from("course_categories").insert(categoriesData);
    }
  }
  
  return data;
}

export async function updateCourseStatus(id: string, status: ContentStatus) {
  return updateCourse(id, { status });
}

export async function deleteCourse(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  assertServiceResponse(error);
}
