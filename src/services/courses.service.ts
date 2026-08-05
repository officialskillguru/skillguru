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
import { getCourseCurriculum } from "./curriculum.service";

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

export async function getCourseById(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
  assertServiceResponse(error);
  return data;
}

/** Postgres 23505 (unique_violation) on courses.slug reads as raw SQL to a mentor - translate it. */
function assertNotDuplicateSlug(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "23505" &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string" &&
    (error as { message: string }).message.includes("courses_slug_unique")
  ) {
    throw new Error("A course with this title already exists. Try a different title.");
  }
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
  assertNotDuplicateSlug(error);
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
  assertNotDuplicateSlug(error);
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

// ─── Completeness & mentor status transitions ──────────────────────────────
// Deliberately purpose-specific rather than exposing raw updateCourseStatus
// to the mentor UI: each function validates the transition it represents and
// is the single controlled entry point for that action, so a future
// approval-workflow migration has one place to extend rather than every call
// site needing to be found and updated.

export type CourseCompletenessCheck = {
  key: "title" | "description" | "category" | "pricing" | "thumbnail" | "curriculum";
  label: string;
  met: boolean;
};

export type CourseCompleteness = {
  checks: CourseCompletenessCheck[];
  percent: number;
  isComplete: boolean;
};

export async function getCourseCompleteness(courseId: string): Promise<CourseCompleteness> {
  const supabase = getSupabaseClientOrThrow();

  const [course, { data: categoryRows, error: categoryError }, modules] = await Promise.all([
    getCourseById(courseId),
    supabase.from("course_categories").select("category_id").eq("course_id", courseId),
    getCourseCurriculum(courseId),
  ]);
  assertServiceResponse(categoryError);

  const hasLesson = modules
    .filter((m) => !m.deleted_at)
    .some((m) => (m.lessons ?? []).some((l) => !l.deleted_at));

  const priceValid =
    course != null &&
    course.price != null &&
    course.price >= 0 &&
    (course.discount_price == null || (course.discount_price >= 0 && course.discount_price < course.price));

  const checks: CourseCompletenessCheck[] = [
    { key: "title", label: "Course title", met: !!course?.title?.trim() },
    { key: "description", label: "Course description", met: !!course?.description?.trim() },
    { key: "category", label: "At least one category selected", met: (categoryRows?.length ?? 0) > 0 },
    { key: "pricing", label: "Valid pricing", met: priceValid },
    { key: "thumbnail", label: "Thumbnail image", met: !!course?.thumbnail_file_id },
    { key: "curriculum", label: "At least one module with a lesson", met: hasLesson },
  ];

  const metCount = checks.filter((c) => c.met).length;
  return {
    checks,
    percent: Math.round((metCount / checks.length) * 100),
    isComplete: metCount === checks.length,
  };
}

export class CourseNotCompleteError extends Error {
  completeness: CourseCompleteness;
  constructor(completeness: CourseCompleteness) {
    super("This course is missing required information and can't be submitted for review yet.");
    this.name = "CourseNotCompleteError";
    this.completeness = completeness;
  }
}

async function assertOwnedDraftOrThrow(courseId: string, expectedStatus: ContentStatus) {
  const supabase = getSupabaseClientOrThrow();
  const course = await getCourseById(courseId);
  if (!course) throw new Error("Course not found.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // RLS is the actual authority on ownership - this is only a friendly,
  // fast-failing check so the UI can show a clear message instead of a
  // silent RLS-denied no-op.
  if (!user || course.mentor_id !== user.id) {
    throw new Error("You don't have permission to modify this course.");
  }
  if (course.status !== expectedStatus) {
    throw new Error(`This action requires the course to be "${expectedStatus}" (current status: "${course.status}").`);
  }
  return course;
}

/** The only path that moves a mentor's course from draft to under_review. */
export async function submitCourseForReview(courseId: string): Promise<{ course: Course; completeness: CourseCompleteness }> {
  const supabase = getSupabaseClientOrThrow();
  await assertOwnedDraftOrThrow(courseId, "draft");

  const completeness = await getCourseCompleteness(courseId);
  if (!completeness.isComplete) {
    throw new CourseNotCompleteError(completeness);
  }

  const course = await updateCourseStatus(courseId, "under_review");

  const { error: notifyError } = await supabase.rpc("notify_admins_course_submitted", { p_course_id: courseId });
  if (notifyError) {
    // Non-fatal: the course is already submitted; admins just won't get a
    // notification this time. Surfacing this as a hard failure would be
    // worse than a missed notification.
    console.error("Failed to notify admins of course submission", notifyError);
  }

  return { course, completeness };
}

/** Lets a mentor pull a course back out of the review queue. */
export async function withdrawCourseSubmission(courseId: string): Promise<Course> {
  await assertOwnedDraftOrThrow(courseId, "under_review");
  return updateCourseStatus(courseId, "draft");
}

/**
 * Mentor-safe archive. Publishing is deliberately not exposed here - it
 * stays an admin-governed transition until the approval workflow ships.
 */
export async function archiveMentorCourse(courseId: string): Promise<Course> {
  const supabase = getSupabaseClientOrThrow();
  const course = await getCourseById(courseId);
  if (!course) throw new Error("Course not found.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || course.mentor_id !== user.id) {
    throw new Error("You don't have permission to modify this course.");
  }
  if (course.status === "archived") return course;
  return updateCourseStatus(courseId, "archived");
}
