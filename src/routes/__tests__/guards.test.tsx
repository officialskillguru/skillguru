import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Regression test for a real production authorization bypass found via live browser
// testing: AdminProtectedRoute is the ONLY guard on the entire /admin/* route tree
// (router.tsx wraps just once, at the top, and no admin route passes
// requiredPermission) — so its role-based fallback used to be the sole
// authorization check for every admin page. That fallback blanket-granted any
// "counsellor" (plus three role names that don't exist in this database:
// "sales"/"content_manager"/"hr"/"finance") full access to the whole Admin
// surface, including the Teacher CRUD panel with lock/delete/password-reset
// actions. Verified live: a disposable Counsellor account could navigate
// directly to /admin/users/teachers and get the full Admin Teacher panel with
// real data. Fixed by requiring the "admin" role (or an explicit
// requiredPermission match) to pass this gate at all.

const mockAuth = {
  status: "READY" as const,
  authUser: null as null | { roles: string[]; permissions: string[]; passwordResetRequired: boolean; highestRole: string },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/hooks/useMentorPortal", () => ({
  useMentorAccountStatus: () => ({ data: undefined, isLoading: false }),
}));

// Imported after the mocks above, which vitest hoists.
import { AdminProtectedRoute } from "../guards";

function renderAtAdminRoute(authUser: NonNullable<typeof mockAuth.authUser>) {
  mockAuth.authUser = authUser;
  return render(
    <MemoryRouter initialEntries={["/admin/users/teachers"]}>
      <Routes>
        <Route
          path="/admin/users/teachers"
          element={
            <AdminProtectedRoute>
              <div>Admin Teachers Panel</div>
            </AdminProtectedRoute>
          }
        />
        <Route path="/counsellor/dashboard" element={<div>Counsellor Dashboard</div>} />
        <Route path="/mentor/overview" element={<div>Mentor Overview</div>} />
        <Route path="/dashboard" element={<div>Student Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminProtectedRoute", () => {
  it("lets a real admin through to the admin route tree", () => {
    renderAtAdminRoute({ roles: ["admin"], permissions: [], passwordResetRequired: false, highestRole: "admin" });
    expect(screen.getByText("Admin Teachers Panel")).toBeInTheDocument();
  });

  it("blocks a counsellor from the admin route tree and redirects to their own dashboard (regression: this used to render the admin panel)", () => {
    renderAtAdminRoute({ roles: ["counsellor"], permissions: [], passwordResetRequired: false, highestRole: "counsellor" });
    expect(screen.queryByText("Admin Teachers Panel")).not.toBeInTheDocument();
    expect(screen.getByText("Counsellor Dashboard")).toBeInTheDocument();
  });

  it("blocks a mentor/teacher from the admin route tree", () => {
    renderAtAdminRoute({ roles: ["mentor"], permissions: [], passwordResetRequired: false, highestRole: "mentor" });
    expect(screen.queryByText("Admin Teachers Panel")).not.toBeInTheDocument();
    expect(screen.getByText("Mentor Overview")).toBeInTheDocument();
  });

  it("blocks a student from the admin route tree", () => {
    renderAtAdminRoute({ roles: ["student"], permissions: [], passwordResetRequired: false, highestRole: "student" });
    expect(screen.queryByText("Admin Teachers Panel")).not.toBeInTheDocument();
    expect(screen.getByText("Student Dashboard")).toBeInTheDocument();
  });

  it("does not grant access merely from a stray/non-existent role name reaching the fallback", () => {
    renderAtAdminRoute({ roles: ["sales"], permissions: [], passwordResetRequired: false, highestRole: "student" });
    expect(screen.queryByText("Admin Teachers Panel")).not.toBeInTheDocument();
  });
});
