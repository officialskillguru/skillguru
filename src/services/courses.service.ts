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

  let query = supabase.from("courses").select("*, course_categories(category_id)", { count: "exact" });

  if (search) {
    // normalizeSearchTerm() already wraps the term in %...% - don't wrap it again here.
    query = query.or(`title.ilike.${search},slug.ilike.${search},description.ilike.${search}`);
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

export async function getCourseById(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
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

/**
 * Fans out "course submitted for review" to every admin via a SECURITY
 * DEFINER RPC - the notifications table's INSERT RLS policy only allows
 * admin/super_admin callers, so a mentor can't insert these rows directly.
 */
export async function notifyAdminsCourseSubmitted(courseId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.rpc("notify_admins_course_submitted", { p_course_id: courseId });
  assertServiceResponse(error);
}

export async function deleteCourse(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  assertServiceResponse(error);
}

// ============================================================================
// Public-facing (anonymous-safe) course discovery
// ============================================================================
// Everything below this line always forces status = 'published' AND
// deleted_at IS NULL server-side, regardless of what other filters a caller
// passes - unlike the admin listCourses()/searchCourses() paths above, which
// let an explicit status filter through. Never reuse the admin path for a
// public surface.

export type CategoryRow = Tables<"categories">;
export type PublicCategory = CategoryRow & { subcategories: CategoryRow[] };

/** Active (deleted_at IS NULL) categories, top-level with nested subcategories, for the public navbar/courses filters. */
export async function listPublicCategories(): Promise<PublicCategory[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  assertServiceResponse(error);

  const rows = data ?? [];
  const byParent = new Map<string, CategoryRow[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    const list = byParent.get(row.parent_id) ?? [];
    list.push(row);
    byParent.set(row.parent_id, list);
  }

  return rows
    .filter((row) => !row.parent_id)
    .map((row) => ({ ...row, subcategories: byParent.get(row.id) ?? [] }));
}

export type PublicCourseCategoryEmbed = { categories: Pick<CategoryRow, "id" | "name" | "slug"> | null };
export type PublicCourseRow = Course & {
  course_categories: PublicCourseCategoryEmbed[];
  mentor_name: string | null;
  mentor_avatar_url: string | null;
  avg_rating: number | null;
  review_count: number;
  enrollment_count: number;
};

export type PublicCourseFilters = {
  search?: string;
  categorySlug?: string;
  level?: string;
  language?: string;
  courseType?: string;
  freeOnly?: boolean;
  mentorId?: string;
  excludeId?: string;
  page?: number;
  pageSize?: number;
};

/** Resolves a category (or subcategory) slug to the set of category ids to match - a parent slug also matches all of its subcategories. */
async function resolveCategoryIdsForSlug(slug: string): Promise<string[] | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data: match, error } = await supabase
    .from("categories")
    .select("id, parent_id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  assertServiceResponse(error);
  if (!match) return [];

  if (match.parent_id) return [match.id];

  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", match.id)
    .is("deleted_at", null);
  return [match.id, ...((children ?? []).map((c) => c.id))];
}

export async function listPublishedCourses(filters: PublicCourseFilters = {}): Promise<PaginatedResult<PublicCourseRow>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(filters);
  const search = normalizeSearchTerm(filters.search);

  let query = supabase
    .from("courses")
    .select("*, course_categories(categories(id, name, slug))", { count: "exact" })
    .eq("status", "published")
    .is("deleted_at", null);

  if (search) {
    query = query.or(`title.ilike.${search},description.ilike.${search},short_description.ilike.${search}`);
  }
  if (filters.level) query = query.eq("level", filters.level as NonNullable<Course["level"]>);
  if (filters.language) query = query.eq("language", filters.language);
  if (filters.courseType) query = query.eq("course_type", filters.courseType);
  if (filters.mentorId) query = query.eq("mentor_id", filters.mentorId);
  if (filters.excludeId) query = query.neq("id", filters.excludeId);
  if (filters.freeOnly) query = query.or("price.is.null,price.eq.0");

  if (filters.categorySlug) {
    const categoryIds = await resolveCategoryIdsForSlug(filters.categorySlug);
    if (!categoryIds || categoryIds.length === 0) {
      return { data: [], count: 0, page, pageSize, totalPages: 0 };
    }
    const { data: matches } = await supabase.from("course_categories").select("course_id").in("category_id", categoryIds);
    const courseIds = Array.from(new Set((matches ?? []).map((m) => m.course_id)));
    if (courseIds.length === 0) return { data: [], count: 0, page, pageSize, totalPages: 0 };
    query = query.in("id", courseIds);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<(Course & { course_categories: PublicCourseCategoryEmbed[] })[]>();
  assertServiceResponse(error);

  const rows = data ?? [];
  const courseIds = rows.map((r) => r.id);
  const mentorIds = Array.from(new Set(rows.map((r) => r.mentor_id)));

  const [profilesResult, ratingResult, enrollmentResult] = await Promise.all([
    mentorIds.length > 0 ? supabase.rpc("get_public_mentor_profiles", { p_mentor_ids: mentorIds }) : Promise.resolve({ data: [] }),
    courseIds.length > 0 ? supabase.from("course_rating_summary").select("*").in("course_id", courseIds) : Promise.resolve({ data: [] }),
    courseIds.length > 0 ? supabase.rpc("get_public_course_enrollment_counts", { p_course_ids: courseIds }) : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
  const ratingMap = new Map((ratingResult.data ?? []).map((r) => [r.course_id, r]));
  const enrollmentMap = new Map((enrollmentResult.data ?? []).map((e) => [e.course_id, Number(e.enrollment_count)]));

  const mappedData: PublicCourseRow[] = rows.map((row) => {
    const profile = profileMap.get(row.mentor_id);
    const rating = ratingMap.get(row.id);
    return {
      ...row,
      mentor_name: profile?.full_name ?? null,
      mentor_avatar_url: null,
      avg_rating: rating?.avg_rating ?? null,
      review_count: rating?.review_count ?? 0,
      enrollment_count: enrollmentMap.get(row.id) ?? 0,
    };
  });

  return { data: mappedData, count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

// ============================================================================
// course_media (gallery / placement images & video)
// ============================================================================
export type CourseMedia = Tables<"course_media">;

export async function listCourseMedia(courseId: string, mediaType?: CourseMedia["media_type"]) {
  const supabase = getSupabaseClientOrThrow();
  let query = supabase.from("course_media").select("*").eq("course_id", courseId).order("sort_order", { ascending: true });
  if (mediaType) query = query.eq("media_type", mediaType);
  const { data, error } = await query;
  assertServiceResponse(error);
  return data ?? [];
}

export async function createCourseMedia(input: Inserts<"course_media">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("course_media").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteCourseMedia(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("course_media").delete().eq("id", id);
  assertServiceResponse(error);
}

// ============================================================================
// course_faqs
// ============================================================================
export type CourseFaq = Tables<"course_faqs">;

export async function listCourseFaqs(courseId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("course_faqs").select("*").eq("course_id", courseId).order("sort_order", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

export async function createCourseFaq(input: Inserts<"course_faqs">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("course_faqs").insert(input).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function updateCourseFaq(id: string, input: Updates<"course_faqs">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("course_faqs").update(input).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

export async function deleteCourseFaq(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("course_faqs").delete().eq("id", id);
  assertServiceResponse(error);
}

// ============================================================================
// Reviews (testimonials) + rating summary
// ============================================================================
export async function listCourseTestimonials(courseId: string, limit = 20) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("testimonials")
    .select("id, content, rating, created_at, student_id, mentor_reply, mentor_replied_at")
    .eq("course_id", courseId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  assertServiceResponse(error);

  const rows = data ?? [];
  const studentIds = Array.from(new Set(rows.map((r) => r.student_id).filter((id): id is string => !!id)));
  let studentMap = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: students } = await supabase.from("profiles").select("id, full_name").in("id", studentIds);
    studentMap = new Map((students ?? []).map((s) => [s.id, s.full_name ?? "Verified Student"]));
  }

  return rows.map((r) => ({ ...r, student_name: (r.student_id && studentMap.get(r.student_id)) || "Verified Student" }));
}

export async function getCourseRatingSummary(courseId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("course_rating_summary").select("avg_rating, review_count").eq("course_id", courseId).maybeSingle();
  assertServiceResponse(error);
  return data ?? { avg_rating: null, review_count: 0 };
}

// ============================================================================
// Course-linked success stories (Placement & Career Outcomes)
// ============================================================================
export async function listCourseSuccessStories(courseId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("success_stories")
    .select("*")
    .eq("course_id", courseId)
    .eq("published", true)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

/** Admin-only: every success story, so one can be tagged to/untagged from a specific course. */
export async function listAllSuccessStoriesForTagging() {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("success_stories")
    .select("id, title, company_name, course_id")
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

export async function setSuccessStoryCourseId(storyId: number, courseId: string | null) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("success_stories").update({ course_id: courseId }).eq("id", storyId);
  assertServiceResponse(error);
}
