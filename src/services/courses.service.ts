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

/** Active, non-deleted categories only - the set a mentor may select for a course. */
export async function listCourseCategories() {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  assertServiceResponse(error);
  return data ?? [];
}

/**
 * The calling mentor's own pending/rejected proposals - never active
 * categories (those already come back from listCourseCategories). RLS lets
 * a mentor see their own non-active rows (consolidated_select's
 * created_by = auth.uid() branch, added by Phase B), but
 * listCourseCategories() deliberately excludes non-active rows for the
 * general selector, so this is a separate, narrower query rather than
 * loosening that one.
 */
export async function listMyCategoryProposals() {
  const supabase = getSupabaseClientOrThrow();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .neq("status", "active")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}

// ============================================================================
// Admin category/taxonomy management
// ============================================================================
// Categories are admin-governed: RLS (consolidated_insert/update/delete on
// public.categories) already restricts writes to has_role('admin'). A
// mentor-proposal path (status='pending' inserts) is a later phase's scope,
// not introduced here - every category created through these functions is
// 'active' immediately, matching how admin-authored categories always
// worked before the status column existed.

export type CategoryStatus = "pending" | "active" | "rejected" | "archived";

export type AdminCategoryRow = Omit<Tables<"categories">, "status"> & {
  status: CategoryStatus;
  parent_name: string | null;
  course_count: number;
};

export type AdminCategoryListParams = {
  search?: string;
  status?: CategoryStatus | "all";
  /** "all" = no parent filter, "top-level" = parent_id IS NULL, any other value = an exact parent category id. */
  parentId?: string;
};

export type CategoryInput = {
  name: string;
  slug?: string;
  description?: string | null;
  parent_id?: string | null;
  icon?: string | null;
  sort_order?: number;
};

/** Postgres 23505 (unique_violation) on categories.slug reads as raw SQL to an admin - translate it. */
function assertNotDuplicateCategorySlug(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "23505" &&
    "message" in error &&
    typeof (error as { message?: string }).message === "string" &&
    (error as { message: string }).message.includes("categories_slug_unique")
  ) {
    throw new Error("A category with this name already exists. Try a different name.");
  }
}

/**
 * Full admin taxonomy list - search/status/parent filterable, with course
 * count and parent name resolved without N+1 (two extra bounded queries
 * total, regardless of result set size, not one query per row).
 */
export async function listAdminCategories(params: AdminCategoryListParams = {}): Promise<AdminCategoryRow[]> {
  const supabase = getSupabaseClientOrThrow();
  let query = supabase.from("categories").select("*").is("deleted_at", null).order("sort_order", { ascending: true });

  const term = normalizeSearchTerm(params.search);
  if (term) {
    query = query.or(`name.ilike.${term},slug.ilike.${term}`);
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.parentId === "top-level") {
    query = query.is("parent_id", null);
  } else if (params.parentId && params.parentId !== "all") {
    query = query.eq("parent_id", params.parentId);
  }

  const { data, error } = await query;
  assertServiceResponse(error);
  const rows = data ?? [];

  const categoryIds = rows.map((r) => r.id);
  const courseCountMap = new Map<string, number>();
  if (categoryIds.length > 0) {
    const { data: joinRows, error: joinError } = await supabase
      .from("course_categories")
      .select("category_id")
      .in("category_id", categoryIds);
    assertServiceResponse(joinError);
    for (const row of joinRows ?? []) {
      courseCountMap.set(row.category_id, (courseCountMap.get(row.category_id) ?? 0) + 1);
    }
  }

  const parentNameMap = new Map<string, string>();
  for (const row of rows) parentNameMap.set(row.id, row.name);
  const missingParentIds = Array.from(
    new Set(rows.map((r) => r.parent_id).filter((id): id is string => !!id && !parentNameMap.has(id)))
  );
  if (missingParentIds.length > 0) {
    const { data: parents, error: parentsError } = await supabase.from("categories").select("id, name").in("id", missingParentIds);
    assertServiceResponse(parentsError);
    for (const p of parents ?? []) parentNameMap.set(p.id, p.name);
  }

  return rows.map((row) => ({
    ...row,
    status: row.status as CategoryStatus,
    parent_name: row.parent_id ? (parentNameMap.get(row.parent_id) ?? null) : null,
    course_count: courseCountMap.get(row.id) ?? 0,
  }));
}

export async function createCategory(input: CategoryInput) {
  const supabase = getSupabaseClientOrThrow();
  const slug = createSlug(input.slug ?? input.name);
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      slug,
      description: input.description ?? null,
      parent_id: input.parent_id ?? null,
      icon: input.icon ?? null,
      sort_order: input.sort_order ?? 0,
      status: "active",
    })
    .select("*")
    .single();
  assertNotDuplicateCategorySlug(error);
  assertServiceResponse(error);
  return data;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const supabase = getSupabaseClientOrThrow();
  const payload: Updates<"categories"> = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.slug !== undefined ? { slug: createSlug(input.slug) } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.parent_id !== undefined ? { parent_id: input.parent_id } : {}),
    ...(input.icon !== undefined ? { icon: input.icon } : {}),
    ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
  };
  const { data, error } = await supabase.from("categories").update(payload).eq("id", id).select("*").single();
  assertNotDuplicateCategorySlug(error);
  assertServiceResponse(error);
  return data;
}

/** The "activate/deactivate" action - archiving hides a category from new selection while preserving its existing course associations (course_categories rows are untouched). */
export async function setCategoryStatus(id: string, status: Extract<CategoryStatus, "active" | "archived">) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("categories").update({ status }).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

/**
 * Hard delete. Blocked at the database level (prevent_referenced_category_deletion
 * trigger) if the category has subcategories or any course association - the
 * resulting Postgres error message is descriptive and safe to surface as-is.
 */
export async function deleteCategory(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  assertServiceResponse(error);
}

// ─── Mentor category proposals (Phase B) ───────────────────────────────────
// The enforce_category_proposal_ownership trigger (20260807000001) is the
// actual security boundary: it forces status='pending' and
// created_by=auth.uid() on any non-admin insert regardless of what this
// function sends. Sending "pending" explicitly here is just honest client
// code, not the guarantee itself.

/** Mentor-facing: propose a new category/subcategory. Always lands as 'pending' - enforced by the database trigger, not this function. */
export async function proposeCategory(input: CategoryInput & { reason?: string }): Promise<AdminCategoryRow> {
  const supabase = getSupabaseClientOrThrow();
  const slug = createSlug(input.slug ?? input.name);
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      slug,
      description: input.reason ? `${input.description ?? ""}\n\nReason: ${input.reason}`.trim() : (input.description ?? null),
      parent_id: input.parent_id ?? null,
      sort_order: input.sort_order ?? 0,
      status: "pending",
    })
    .select("*")
    .single();
  assertNotDuplicateCategorySlug(error);
  assertServiceResponse(error);

  try {
    const { error: notifyError } = await supabase.rpc("notify_admins_category_proposed", { p_category_id: data.id });
    if (notifyError) {
      // Non-fatal: the proposal itself succeeded; admins just won't get a
      // notification this time (mirrors submitCourseForReview's identical
      // non-fatal-notification handling).
      console.error("Failed to notify admins of category proposal", notifyError);
    }
  } catch (notifyError) {
    console.error("Failed to notify admins of category proposal", notifyError);
  }

  return data as AdminCategoryRow;
}

/** Admin-facing: pending -> active. */
export async function approveCategory(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("categories").update({ status: "active" }).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return data;
}

/** Admin-facing: pending -> rejected, with an optional reason surfaced to the proposing mentor via notification. */
export async function rejectCategory(id: string, reason?: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("categories").update({ status: "rejected" }).eq("id", id).select("*").single();
  assertServiceResponse(error);
  return { category: data, reason };
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

/**
 * Mentor-facing "Duplicate": clones a course's own fields (title/pricing/
 * outcomes/media refs/category links) into a brand-new draft. Never copies
 * curriculum (modules/lessons) - matches the admin duplicate action's scope,
 * which only ever copied course-level fields too. mentorId is always the
 * caller's own id, never trusted from the source row, matching
 * useCreateMentorCourse's existing convention.
 */
export async function duplicateMentorCourse(courseId: string, mentorId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data: source, error } = await supabase
    .from("courses")
    .select("*, course_categories(category_id)")
    .eq("id", courseId)
    .single();
  assertServiceResponse(error);

  const selectedCategoryIds = (source.course_categories ?? []).map((cc) => cc.category_id);

  const {
    id: _id,
    slug: _slug,
    status: _status,
    created_at: _created_at,
    updated_at: _updated_at,
    deleted_at: _deleted_at,
    created_by: _created_by,
    updated_by: _updated_by,
    deleted_by: _deleted_by,
    course_categories: _course_categories,
    mentor_id: _mentor_id,
    ...rest
  } = source;

  return createCourse({
    ...rest,
    title: `${source.title} (Copy)`,
    mentor_id: mentorId,
    status: "draft",
    selectedCategoryIds,
  });
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
  await assertOwnedDraftOrThrow(courseId, "draft");

  const completeness = await getCourseCompleteness(courseId);
  if (!completeness.isComplete) {
    throw new CourseNotCompleteError(completeness);
  }

  const course = await updateCourseStatus(courseId, "under_review");

  try {
    await notifyAdminsCourseSubmitted(courseId);
  } catch (notifyError) {
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

/** Active (deleted_at IS NULL, status='active') categories, top-level with nested subcategories, for the public navbar/courses filters. Pending/rejected/archived categories never appear here. */
export async function listPublicCategories(): Promise<PublicCategory[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .eq("status", "active")
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
    .eq("status", "active")
    .maybeSingle();
  assertServiceResponse(error);
  if (!match) return [];

  if (match.parent_id) return [match.id];

  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", match.id)
    .is("deleted_at", null)
    .eq("status", "active");
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
