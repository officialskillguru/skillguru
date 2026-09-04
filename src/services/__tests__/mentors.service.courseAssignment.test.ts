import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as SharedModule from "../_shared";

// Records every operation performed on a chainable query builder (table, verb,
// and the filters applied) so tests can assert real call order/arguments —
// not just that "some" supabase call happened.
interface RecordedOp {
  table: string;
  verb: "select" | "insert" | "update" | "delete";
  payload?: unknown;
  filters: Record<string, unknown>;
}

function makeBuilder(table: string, log: RecordedOp[], result: { data: unknown; error: unknown }) {
  const op: RecordedOp = { table, verb: "select", filters: {} };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn((..._args: unknown[]) => {
    op.verb = "select";
    return builder;
  });
  builder.insert = vi.fn((payload: unknown) => {
    op.verb = "insert";
    op.payload = payload;
    log.push({ ...op });
    return builder;
  });
  builder.update = vi.fn((payload: unknown) => {
    op.verb = "update";
    op.payload = payload;
    return builder;
  });
  builder.delete = vi.fn(() => {
    op.verb = "delete";
    return builder;
  });
  builder.eq = vi.fn((col: string, val: unknown) => {
    op.filters[col] = val;
    return builder;
  });
  builder.in = vi.fn((col: string, val: unknown) => {
    op.filters[col] = val;
    return builder;
  });
  builder.is = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.then = (resolve: (v: unknown) => unknown) => {
    // Non-select terminal ops (insert/update/delete) are logged here, once the
    // full filter chain has been applied, so `filters` reflects the final call.
    if (op.verb !== "select") {
      const already = log[log.length - 1];
      if (already !== op) log.push({ ...op });
      else log[log.length - 1] = { ...op };
    }
    return Promise.resolve(result).then(resolve);
  };
  return builder;
}

describe("mentors.service — course_mentors many-to-many assignment", () => {
  let byTableResult: Record<string, { data: unknown; error: unknown }>;
  let opLog: RecordedOp[];
  let mockSupabase: { from: ReturnType<typeof vi.fn>; rpc: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.resetModules();
    byTableResult = {};
    opLog = [];
    mockSupabase = {
      from: vi.fn((table: string) => makeBuilder(table, opLog, byTableResult[table] ?? { data: null, error: null })),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    };
  });

  async function loadService() {
    vi.doMock("../_shared", async () => {
      const actual = await vi.importActual<typeof SharedModule>("../_shared");
      return { ...actual, getSupabaseClientOrThrow: () => mockSupabase };
    });
    return import("../mentors.service");
  }

  it("assignMentorToCourse inserts a non-primary course_mentors row", async () => {
    const { assignMentorToCourse } = await loadService();
    await assignMentorToCourse("mentor-1", "course-1");
    const insertOp = opLog.find((o) => o.table === "course_mentors" && o.verb === "insert");
    expect(insertOp?.payload).toEqual({ mentor_id: "mentor-1", course_id: "course-1", is_primary: false });
  });

  it("removeMentorFromCourse deletes exactly the (mentor, course) pair, not every assignment for that course", async () => {
    const { removeMentorFromCourse } = await loadService();
    await removeMentorFromCourse("mentor-1", "course-1");
    const deleteOp = opLog.find((o) => o.table === "course_mentors" && o.verb === "delete");
    expect(deleteOp?.filters).toEqual({ mentor_id: "mentor-1", course_id: "course-1" });
  });

  it("setPrimaryMentorForCourse clears the existing primary before setting the new one (never two primaries at once)", async () => {
    const { setPrimaryMentorForCourse } = await loadService();
    await setPrimaryMentorForCourse("mentor-2", "course-1");
    const updates = opLog.filter((o) => o.table === "course_mentors" && o.verb === "update");
    expect(updates).toHaveLength(2);
    const [clearOp, setOp] = updates;
    expect(clearOp?.payload).toEqual({ is_primary: false });
    expect(clearOp?.filters).toMatchObject({ course_id: "course-1", is_primary: true });
    expect(setOp?.payload).toEqual({ is_primary: true });
    expect(setOp?.filters).toMatchObject({ course_id: "course-1", mentor_id: "mentor-2" });
  });

  // Regression test for a real bug found during QA of the Admin Teachers panel: the bulk
  // "Transfer" action updates the legacy courses.mentor_id column, which fires a DB trigger
  // that inserts a course_mentors row for the NEW mentor — but only marks it primary if no
  // primary row already exists for that course. If the OLD mentor's row (still marked
  // primary) isn't removed first, "transfer" would silently leave two co-teachers instead
  // of actually transferring ownership. reassignMentorCourses must delete the old mentor's
  // row before updating courses.mentor_id, in that order.
  it("reassignMentorCourses removes the old mentor's course_mentors row before updating courses.mentor_id", async () => {
    byTableResult.courses = { data: [{ id: "course-1", mentor_id: "mentor-old" }], error: null };
    const { reassignMentorCourses } = await loadService();
    await reassignMentorCourses(["course-1"], "mentor-new");

    const deleteOp = opLog.find((o) => o.table === "course_mentors" && o.verb === "delete");
    const coursesUpdateOp = opLog.find((o) => o.table === "courses" && o.verb === "update");
    const primaryOp = opLog.find(
      (o) => o.table === "course_mentors" && o.verb === "update" && (o.payload as Record<string, unknown>)?.is_primary === true
    );

    expect(deleteOp?.filters).toEqual({ course_id: "course-1", mentor_id: "mentor-old" });
    expect(coursesUpdateOp?.payload).toEqual({ mentor_id: "mentor-new" });
    expect(primaryOp?.filters).toMatchObject({ course_id: "course-1", mentor_id: "mentor-new" });

    // Order: the old row must be gone before courses.mentor_id changes, so the sync
    // trigger has no existing primary left to conflict with.
    const deleteIndex = opLog.indexOf(deleteOp!);
    const updateIndex = opLog.indexOf(coursesUpdateOp!);
    expect(deleteIndex).toBeLessThan(updateIndex);
  });

  it("reassignMentorCourses does nothing for a course whose mentor is already the destination (no-op, no duplicate delete)", async () => {
    byTableResult.courses = { data: [{ id: "course-1", mentor_id: "mentor-same" }], error: null };
    const { reassignMentorCourses } = await loadService();
    await reassignMentorCourses(["course-1"], "mentor-same");

    const deleteOp = opLog.find((o) => o.table === "course_mentors" && o.verb === "delete");
    expect(deleteOp).toBeUndefined();
  });
});
