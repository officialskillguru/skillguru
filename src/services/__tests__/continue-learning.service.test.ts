import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression test for a real bug found during live browser testing: a student
// enrolled in a course that is later moved back to draft/archived has courses
// RLS correctly hide that course row from them (published-only visibility),
// but the enrollment itself is untouched and still "active". The service used
// to fetch the course with .single(), which throws a hard PostgREST error on
// zero rows and surfaced as a scary "Continue Learning unavailable" error
// state on the dashboard instead of a graceful "nothing to continue right
// now". Fixed to use maybeSingle() and return ok(null) when the course is
// null with no query error.

interface RecordedCall {
  table: string;
  filters: Record<string, unknown>;
}

function makeEnrollmentBuilder(log: RecordedCall[]) {
  const call: RecordedCall = { table: "enrollments", filters: {} };
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((col: string, val: unknown) => { call.filters[col] = val; return builder; });
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => {
    log.push(call);
    return Promise.resolve({ data: { id: "enr-1", course_id: "course-draft-1", student_id: "student-1", status: "active" }, error: null });
  });
  return builder;
}

function makeCourseBuilder(log: RecordedCall[]) {
  const call: RecordedCall = { table: "courses", filters: {} };
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((col: string, val: unknown) => { call.filters[col] = val; return builder; });
  // Course exists but was moved to draft — RLS makes it invisible to this
  // student, so PostgREST returns zero rows: maybeSingle() resolves to
  // { data: null, error: null } (unlike single(), which would error).
  builder.maybeSingle = vi.fn(() => {
    log.push(call);
    return Promise.resolve({ data: null, error: null });
  });
  return builder;
}

const opLog: RecordedCall[] = [];

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "enrollments") return makeEnrollmentBuilder(opLog);
      if (table === "courses") return makeCourseBuilder(opLog);
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  },
}));

// Imported after the mock above, which vitest hoists.
import { ContinueLearningService } from "../continue-learning.service";

describe("ContinueLearningService.getContinueLearning", () => {
  beforeEach(() => {
    opLog.length = 0;
  });

  it("resolves to ok(null) instead of a hard error when the enrolled course is hidden by RLS (draft/archived)", async () => {
    const service = new ContinueLearningService();
    const result = await service.getContinueLearning("student-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});
