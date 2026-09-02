import { describe, it, expect } from "vitest";
import { IdentityService } from "../IdentityService";

// Regression test for a real bug found during the Counsellor role rollout QA pass:
// resolveHighestRole() never checked for "counsellor" at all, so any counsellor-only
// account fell through to the "student" fallback and would have been routed to the
// student dashboard forever, with no way to reach the Counsellor portal. No live
// account was ever actually misrouted (the counsellor role didn't exist in the
// database until this rollout's first migration), but this locks the fix in.
describe("IdentityService.resolveHighestRole", () => {
  const service = new IdentityService();
  const resolve = (roles: string[]): string =>
    (service as unknown as { resolveHighestRole: (roles: string[]) => string }).resolveHighestRole(roles);

  it("resolves a counsellor-only account to counsellor, not the student fallback", () => {
    expect(resolve(["counsellor"])).toBe("counsellor");
  });

  it("still prioritizes admin over counsellor for a multi-role account", () => {
    expect(resolve(["counsellor", "admin"])).toBe("admin");
  });

  it("prioritizes counsellor over mentor and student for a multi-role account", () => {
    expect(resolve(["student", "mentor", "counsellor"])).toBe("counsellor");
  });

  it("still resolves mentor-only and student-only accounts correctly (no regression)", () => {
    expect(resolve(["mentor"])).toBe("mentor");
    expect(resolve(["student"])).toBe("student");
  });

  it("falls back to student when no recognized role is present", () => {
    expect(resolve([])).toBe("student");
    expect(resolve(["some_future_role"])).toBe("student");
  });
});
