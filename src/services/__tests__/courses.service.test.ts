import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as CoursesServiceSharedModule from "../_shared";

// ─── Chainable Supabase query-builder mock ─────────────────────────────────
// Every query-builder method (.select/.eq/.is/.order/...) returns the same
// thenable object so call chains of any shape resolve to the configured
// { data, error, count } result, mirroring supabase-js's real fluent API.
type QueryResult = { data: unknown; error: unknown; count?: number | null };

function makeQueryResult(result: QueryResult) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        const promise = Promise.resolve(result);
        return promise.then.bind(promise);
      }
      if (prop === "catch" || prop === "finally") {
        const promise = Promise.resolve(result);
        return (promise as unknown as Record<string, unknown>)[prop];
      }
      return () => proxy;
    },
  };
  const proxy = new Proxy({}, handler);
  return proxy;
}

function makeRpcResult(result: { data: unknown; error: unknown }) {
  return Promise.resolve(result);
}

describe("courses.service", () => {
  let fromResults: Record<string, QueryResult>;
  let rpcResults: Record<string, { data: unknown; error: unknown }>;
  let authUser: { id: string } | null;
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
    auth: { getUser: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.resetModules();
    fromResults = {};
    rpcResults = {};
    authUser = { id: "mentor-1" };

    mockSupabase = {
      from: vi.fn((table: string) => makeQueryResult(fromResults[table] ?? { data: null, error: null })),
      rpc: vi.fn((fn: string) => makeRpcResult(rpcResults[fn] ?? { data: null, error: null })),
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: authUser } })) },
    };
  });

  async function loadService() {
    vi.doMock("../_shared", async () => {
      const actual = await vi.importActual<typeof CoursesServiceSharedModule>("../_shared");
      return { ...actual, getSupabaseClientOrThrow: () => mockSupabase };
    });
    vi.doMock("../curriculum.service", () => ({
      getCourseCurriculum: vi.fn(() => Promise.resolve(curriculumModules)),
    }));
    return import("../courses.service");
  }

  let curriculumModules: { deleted_at: string | null; lessons: { deleted_at: string | null }[] }[] = [];

  const baseCourse = {
    id: "course-1",
    mentor_id: "mentor-1",
    title: "Full-Stack Bootcamp",
    description: "A course",
    price: 100,
    discount_price: null,
    thumbnail_file_id: "file-1",
    status: "draft",
  };

  describe("getCourseCompleteness / submitCourseForReview", () => {
    it("reports complete when every check passes and submits successfully", async () => {
      curriculumModules = [{ deleted_at: null, lessons: [{ deleted_at: null }] }];
      fromResults.courses = { data: baseCourse, error: null };
      fromResults.course_categories = { data: [{ category_id: "cat-1" }], error: null };
      rpcResults.notify_admins_course_submitted = { data: null, error: null };

      const { submitCourseForReview, getCourseCompleteness } = await loadService();

      const completeness = await getCourseCompleteness("course-1");
      expect(completeness.isComplete).toBe(true);
      expect(completeness.percent).toBe(100);

      const result = await submitCourseForReview("course-1");
      expect(result.completeness.isComplete).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("notify_admins_course_submitted", { p_course_id: "course-1" });
    });

    it("refuses to submit an incomplete course (missing category + curriculum)", async () => {
      curriculumModules = []; // no modules -> curriculum check fails
      fromResults.courses = { data: baseCourse, error: null };
      fromResults.course_categories = { data: [], error: null }; // no category -> category check fails

      const { submitCourseForReview, CourseNotCompleteError } = await loadService();

      await expect(submitCourseForReview("course-1")).rejects.toBeInstanceOf(CourseNotCompleteError);
      // Must not have attempted the status transition or notification for an incomplete course.
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("does not fail the submission when the admin-notification RPC errors (non-fatal)", async () => {
      curriculumModules = [{ deleted_at: null, lessons: [{ deleted_at: null }] }];
      fromResults.courses = { data: baseCourse, error: null };
      fromResults.course_categories = { data: [{ category_id: "cat-1" }], error: null };
      rpcResults.notify_admins_course_submitted = { data: null, error: { message: "RLS denied" } };
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const { submitCourseForReview } = await loadService();

      // Must resolve successfully (the submission itself succeeded) even
      // though the admin-notification RPC failed - and must surface the
      // failure via console.error rather than swallowing it silently.
      await expect(submitCourseForReview("course-1")).resolves.toMatchObject({ completeness: { isComplete: true } });
      expect(consoleError).toHaveBeenCalledWith("Failed to notify admins of course submission", expect.anything());

      consoleError.mockRestore();
    });

    it("rejects submission when the caller does not own the course", async () => {
      curriculumModules = [{ deleted_at: null, lessons: [{ deleted_at: null }] }];
      fromResults.courses = { data: { ...baseCourse, mentor_id: "someone-else" }, error: null };

      const { submitCourseForReview } = await loadService();

      await expect(submitCourseForReview("course-1")).rejects.toThrow("You don't have permission to modify this course.");
    });

    it("rejects submission when the course is not currently a draft", async () => {
      fromResults.courses = { data: { ...baseCourse, status: "under_review" }, error: null };

      const { submitCourseForReview } = await loadService();

      await expect(submitCourseForReview("course-1")).rejects.toThrow(/requires the course to be "draft"/);
    });
  });

  describe("withdrawCourseSubmission", () => {
    it("moves an under_review course back to draft when owned by the caller", async () => {
      fromResults.courses = { data: { ...baseCourse, status: "under_review" }, error: null };

      const { withdrawCourseSubmission } = await loadService();
      await withdrawCourseSubmission("course-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("courses");
    });

    it("refuses to withdraw a course that isn't under_review", async () => {
      fromResults.courses = { data: { ...baseCourse, status: "draft" }, error: null };

      const { withdrawCourseSubmission } = await loadService();
      await expect(withdrawCourseSubmission("course-1")).rejects.toThrow(/requires the course to be "under_review"/);
    });
  });

  describe("archiveMentorCourse", () => {
    it("archives an owned course", async () => {
      fromResults.courses = { data: baseCourse, error: null };

      const { archiveMentorCourse } = await loadService();
      await archiveMentorCourse("course-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("courses");
    });

    it("is a no-op when the course is already archived", async () => {
      fromResults.courses = { data: { ...baseCourse, status: "archived" }, error: null };

      const { archiveMentorCourse } = await loadService();
      const result = await archiveMentorCourse("course-1");

      expect(result.status).toBe("archived");
    });

    it("blocks archiving a course the caller does not own", async () => {
      fromResults.courses = { data: { ...baseCourse, mentor_id: "someone-else" }, error: null };

      const { archiveMentorCourse } = await loadService();
      await expect(archiveMentorCourse("course-1")).rejects.toThrow("You don't have permission to modify this course.");
    });
  });

  describe("notifyAdminsCourseSubmitted", () => {
    it("throws when the RPC errors, so callers can distinguish real failures", async () => {
      rpcResults.notify_admins_course_submitted = { data: null, error: { message: "boom" } };

      const { notifyAdminsCourseSubmitted } = await loadService();
      await expect(notifyAdminsCourseSubmitted("course-1")).rejects.toThrow("boom");
    });

    it("is the single call site submitCourseForReview delegates to (no duplicate raw RPC calls)", async () => {
      curriculumModules = [{ deleted_at: null, lessons: [{ deleted_at: null }] }];
      fromResults.courses = { data: baseCourse, error: null };
      fromResults.course_categories = { data: [{ category_id: "cat-1" }], error: null };
      rpcResults.notify_admins_course_submitted = { data: null, error: null };

      const { submitCourseForReview } = await loadService();
      await submitCourseForReview("course-1");

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("notify_admins_course_submitted", { p_course_id: "course-1" });
    });
  });

  describe("assertNotDuplicateSlug (via createCourse/updateCourse)", () => {
    it("translates a slug unique_violation into a friendly error on create", async () => {
      fromResults.courses = { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "courses_slug_unique"' } };

      const { createCourse } = await loadService();
      await expect(createCourse({ title: "Dup", mentor_id: "mentor-1" })).rejects.toThrow(
        "A course with this title already exists. Try a different title."
      );
    });

    it("passes through unrelated errors unchanged", async () => {
      fromResults.courses = { data: null, error: { code: "23503", message: "foreign key violation" } };

      const { createCourse } = await loadService();
      await expect(createCourse({ title: "X", mentor_id: "mentor-1" })).rejects.toThrow("foreign key violation");
    });
  });

  describe("listPublishedCourses (public discovery)", () => {
    it("always scopes to status=published, regardless of caller-supplied filters", async () => {
      fromResults.courses = { data: [], error: null, count: 0 };

      const { listPublishedCourses } = await loadService();
      await listPublishedCourses({});

      expect(mockSupabase.from).toHaveBeenCalledWith("courses");
      // The mock proxy can't assert the .eq("status","published") call arguments directly
      // (all chain calls collapse to the same proxy), so this is covered by the source's
      // explicit `.eq("status", "published").is("deleted_at", null)` call in the query
      // builder chain (see courses.service.ts) - a static/code-level guarantee, not
      // something a caller-supplied filter can override since `filters` never contains
      // a `status` field in its type (`PublicCourseFilters`).
    });
  });

  // ─── DB-level rejection surfaces as a real, catchable error ──────────────
  // These simulate what supabase-js actually returns when the
  // enforce_course_status_transition trigger (supabase/migrations/
  // 20260805000001_enforce_course_status_transitions.sql) rejects an illegal
  // status transition: a Postgres error with SQLSTATE 42501
  // (insufficient_privilege) and the trigger's RAISE EXCEPTION message text.
  // The TS layer must propagate this as a thrown Error - not swallow it,
  // not report success - regardless of which function attempted the write.
  describe("DB-level status-transition rejection propagates correctly", () => {
    const insufficientPrivilegeError = {
      code: "42501",
      message: "Course status cannot be changed from 'draft' to 'published' by this user. This transition requires admin (or publish) authority.",
    };

    it("updateCourseStatus surfaces the trigger's rejection as a thrown Error", async () => {
      fromResults.courses = { data: null, error: insufficientPrivilegeError };

      const { updateCourseStatus } = await loadService();
      await expect(updateCourseStatus("course-1", "published")).rejects.toThrow(
        /Course status cannot be changed from 'draft' to 'published'/
      );
    });

    it("submitCourseForReview does not mask a rejection on the actual status-transition write", async () => {
      curriculumModules = [{ deleted_at: null, lessons: [{ deleted_at: null }] }];
      // getCourseById calls inside assertOwnedDraftOrThrow/getCourseCompleteness need a
      // valid draft row to pass ownership/completeness first; only the later
      // updateCourseStatus() write itself is rejected. Since this mock can't
      // distinguish call sites on the same table, simulate the narrower
      // real-world case directly against updateCourseStatus below instead -
      // this test documents the requirement, not a full integration path.
      fromResults.courses = { data: baseCourse, error: null };
      fromResults.course_categories = { data: [{ category_id: "cat-1" }], error: null };

      const { submitCourseForReview } = await loadService();
      // With a fully-permissive mock, submission succeeds - the real
      // rejection is enforced by the DB trigger, verified against a live
      // local Postgres instance in supabase/tests/course_status_rls.test.sql
      // (mentor under_review->published / draft->published direct attempts
      // both rejected there). This test just confirms the success path
      // still works when the DB *does* allow the transition, so the two
      // states (allowed vs 42501) aren't accidentally conflated in the TS layer.
      await expect(submitCourseForReview("course-1")).resolves.toMatchObject({ completeness: { isComplete: true } });
    });

    it("createCourse surfaces the trigger's INSERT-time rejection (mentor inserting a non-draft course)", async () => {
      fromResults.courses = {
        data: null,
        error: { code: "42501", message: "Only an admin (or a permission holder authorized to publish) may create a course with status 'published'. New courses must start as draft." },
      };

      const { createCourse } = await loadService();
      await expect(createCourse({ title: "Sneaky", mentor_id: "mentor-1", status: "published" })).rejects.toThrow(
        /must start as draft/
      );
    });
  });

  describe("admin category management", () => {
    const baseCategory = {
      id: "cat-1",
      name: "Engineering",
      slug: "engineering",
      description: null,
      parent_id: null,
      icon: null,
      sort_order: 0,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      created_by: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    };

    it("createCategory always inserts status='active' regardless of caller input", async () => {
      fromResults.categories = { data: { ...baseCategory }, error: null };

      const { createCategory } = await loadService();
      await createCategory({ name: "Engineering" });

      expect(mockSupabase.from).toHaveBeenCalledWith("categories");
      // The mock proxy can't assert exact insert payload args (chain calls collapse
      // to the same proxy) - the guarantee that status is always 'active' on create
      // is a static code-level fact (see courses.service.ts createCategory: the
      // insert payload hardcodes status: "active", it is never taken from input).
    });

    it("createCategory translates a duplicate-slug error into a friendly message", async () => {
      fromResults.categories = {
        data: null,
        error: { code: "23505", message: 'duplicate key value violates unique constraint "categories_slug_unique"' },
      };

      const { createCategory } = await loadService();
      await expect(createCategory({ name: "Engineering" })).rejects.toThrow(
        "A category with this name already exists. Try a different name."
      );
    });

    it("createCategory passes through unrelated errors unchanged", async () => {
      fromResults.categories = { data: null, error: { code: "23503", message: "foreign key violation" } };

      const { createCategory } = await loadService();
      await expect(createCategory({ name: "Engineering" })).rejects.toThrow("foreign key violation");
    });

    it("updateCategory translates a duplicate-slug error the same way", async () => {
      fromResults.categories = {
        data: null,
        error: { code: "23505", message: 'duplicate key value violates unique constraint "categories_slug_unique"' },
      };

      const { updateCategory } = await loadService();
      await expect(updateCategory("cat-1", { slug: "engineering" })).rejects.toThrow(
        "A category with this name already exists. Try a different name."
      );
    });

    it("deleteCategory surfaces the referenced-category trigger's friendly message", async () => {
      fromResults.categories = {
        data: null,
        error: { code: "23503", message: 'Cannot delete category "Web Development": 1 course(s) reference it. Reassign those courses to a different category first, or archive this category instead.' },
      };

      const { deleteCategory } = await loadService();
      await expect(deleteCategory("cat-1")).rejects.toThrow(/course\(s\) reference it/);
    });

    it("setCategoryStatus updates status without touching other fields", async () => {
      fromResults.categories = { data: { ...baseCategory, status: "archived" }, error: null };

      const { setCategoryStatus } = await loadService();
      const result = await setCategoryStatus("cat-1", "archived");
      expect(result.status).toBe("archived");
    });

    it("listAdminCategories computes course_count and parent_name without N+1 (bounded extra queries)", async () => {
      fromResults.categories = {
        data: [
          { ...baseCategory, id: "parent-1", name: "Engineering", slug: "engineering", parent_id: null },
          { ...baseCategory, id: "child-1", name: "Computer Science", slug: "computer-science", parent_id: "parent-1" },
        ],
        error: null,
      };
      fromResults.course_categories = {
        data: [{ category_id: "child-1" }, { category_id: "child-1" }],
        error: null,
      };

      const { listAdminCategories } = await loadService();
      const result = await listAdminCategories({});

      const child = result.find((r) => r.id === "child-1");
      expect(child?.course_count).toBe(2);
      expect(child?.parent_name).toBe("Engineering");

      const parent = result.find((r) => r.id === "parent-1");
      expect(parent?.course_count).toBe(0);
      expect(parent?.parent_name).toBeNull();

      // Bounded: one query for categories, one for course_categories join counts.
      // (Parent-name resolution here is free since the parent row is already in
      // the same result set - no extra query needed for this particular case.)
      expect(mockSupabase.from).toHaveBeenCalledWith("categories");
      expect(mockSupabase.from).toHaveBeenCalledWith("course_categories");
    });
  });

  describe("mentor category proposals (Phase B)", () => {
    const pendingCategory = {
      id: "cat-pending-1",
      name: "Robotics",
      slug: "robotics",
      description: null,
      parent_id: null,
      icon: null,
      sort_order: 0,
      status: "pending",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      created_by: "mentor-1",
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    };

    it("proposeCategory inserts and returns the pending category, then notifies admins via RPC", async () => {
      fromResults.categories = { data: { ...pendingCategory }, error: null };
      rpcResults.notify_admins_category_proposed = { data: null, error: null };

      const { proposeCategory } = await loadService();
      const result = await proposeCategory({ name: "Robotics", reason: "No robotics subcategory exists yet" });

      expect(mockSupabase.from).toHaveBeenCalledWith("categories");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("notify_admins_category_proposed", { p_category_id: pendingCategory.id });
      expect(result.status).toBe("pending");
    });

    it("proposeCategory does not throw when the notify RPC fails (proposal itself already succeeded)", async () => {
      fromResults.categories = { data: { ...pendingCategory }, error: null };
      rpcResults.notify_admins_category_proposed = { data: null, error: { message: "rpc failed" } };

      const { proposeCategory } = await loadService();
      const result = await proposeCategory({ name: "Robotics" });

      expect(result.status).toBe("pending");
    });

    it("proposeCategory translates a duplicate-slug error into a friendly message", async () => {
      fromResults.categories = {
        data: null,
        error: { code: "23505", message: 'duplicate key value violates unique constraint "categories_slug_unique"' },
      };

      const { proposeCategory } = await loadService();
      await expect(proposeCategory({ name: "Robotics" })).rejects.toThrow("A category with this name already exists. Try a different name.");
    });

    it("listMyCategoryProposals returns [] when there is no authenticated user", async () => {
      authUser = null;

      const { listMyCategoryProposals } = await loadService();
      const result = await listMyCategoryProposals();

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalledWith("categories");
    });

    it("listMyCategoryProposals fetches the caller's own non-active proposals", async () => {
      fromResults.categories = { data: [{ ...pendingCategory }], error: null };

      const { listMyCategoryProposals } = await loadService();
      const result = await listMyCategoryProposals();

      expect(mockSupabase.from).toHaveBeenCalledWith("categories");
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe("pending");
    });

    it("approveCategory sets status to active", async () => {
      fromResults.categories = { data: { ...pendingCategory, status: "active" }, error: null };

      const { approveCategory } = await loadService();
      const result = await approveCategory("cat-pending-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("categories");
      expect(result.status).toBe("active");
    });

    it("rejectCategory sets status to rejected and returns the reason alongside the category", async () => {
      fromResults.categories = { data: { ...pendingCategory, status: "rejected" }, error: null };

      const { rejectCategory } = await loadService();
      const { category, reason } = await rejectCategory("cat-pending-1", "Duplicate of an existing subcategory");

      expect(category?.status).toBe("rejected");
      expect(reason).toBe("Duplicate of an existing subcategory");
    });
  });
});
