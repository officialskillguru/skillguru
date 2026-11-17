import { expect, test } from "@playwright/test";
import { attachIssues, credentials, expectRouteRenders, login, trackIssues, type Role } from "./helpers";

// Every route each role can reach from its navigation (src/routes/router.tsx).
const ROUTES: Record<Role, { home: RegExp; paths: string[] }> = {
  admin: {
    home: /\/admin\/?$/,
    paths: [
      "/admin", "/admin/profile", "/admin/users", "/admin/users/teachers", "/admin/users/counsellors", "/admin/users/roles",
      "/admin/users/invitations", "/admin/courses", "/admin/courses/categories", "/admin/courses/assignments",
      "/admin/students/enrollments", "/admin/students/certificates", "/admin/crm", "/admin/crm/leads",
      "/admin/commerce/payments", "/admin/commerce/coupons", "/admin/commerce/refunds", "/admin/cms/pages",
      "/admin/communication/notifications", "/admin/communication/chat", "/admin/communication/tickets",
      "/admin/placements", "/admin/success-stories", "/admin/calendar", "/admin/analytics", "/admin/audit-logs",
      "/admin/health", "/admin/knowledge-base", "/admin/settings",
    ],
  },
  counsellor: {
    home: /\/counsellor\/dashboard$/,
    paths: ["/counsellor/dashboard", "/counsellor/students", "/counsellor/mentors", "/counsellor/courses", "/counsellor/jobs", "/counsellor/messages", "/counsellor/profile"],
  },
  student: {
    home: /\/dashboard\/?$/,
    paths: [
      "/dashboard", "/dashboard/courses", "/dashboard/certificates", "/dashboard/payments", "/dashboard/profile", "/dashboard/chat",
      "/dashboard/support", "/dashboard/assignments", "/dashboard/mentors", "/dashboard/wishlist", "/dashboard/notes",
      "/dashboard/live-classes", "/dashboard/placement", "/dashboard/resume-builder", "/dashboard/career-guidance",
    ],
  },
  teacher: {
    home: /\/mentor\/overview$/,
    paths: [
      "/mentor/overview", "/mentor/courses", "/mentor/courses/new", "/mentor/students", "/mentor/tasks", "/mentor/reviews",
      "/mentor/jobs", "/mentor/analytics", "/mentor/messages", "/mentor/announcements", "/mentor/notifications",
      "/mentor/live-classes", "/mentor/profile",
    ],
  },
};

// Areas each role must NOT be able to open (guards redirect them away).
const FORBIDDEN: Record<Role, string[]> = {
  admin: [],
  counsellor: ["/admin", "/admin/settings", "/mentor/overview", "/dashboard"],
  student: ["/admin", "/admin/users", "/counsellor/dashboard", "/mentor/overview"],
  teacher: ["/admin", "/admin/users", "/counsellor/dashboard", "/dashboard"],
};

for (const role of Object.keys(ROUTES) as Role[]) {
  test.describe(`${role} portal`, () => {
    test.skip(!credentials(role), `no credentials for ${role}`);

    test(`${role} logs in and lands on the right dashboard`, async ({ page }) => {
      await login(page, role);
      await expect(page).toHaveURL(ROUTES[role].home, { timeout: 20_000 });
    });

    test(`${role} session survives a reload`, async ({ page }) => {
      await login(page, role);
      await page.reload();
      await expect(page).toHaveURL(ROUTES[role].home, { timeout: 20_000 });
    });

    test(`${role} can open every page in their area without errors`, async ({ page }, testInfo) => {
      test.setTimeout(240_000);
      const issues = trackIssues(page);
      await login(page, role);
      const offRoute: string[] = [];
      for (const path of ROUTES[role].paths) {
        await expectRouteRenders(page, path);
        const landed = new URL(page.url()).pathname;
        if (!landed.startsWith(path.replace(/\/[^/]*$/, "")) && landed !== path) offRoute.push(`${path} -> ${landed}`);
      }
      await attachIssues(testInfo, issues);
      expect(offRoute, "pages that redirected away unexpectedly").toEqual([]);
      expect(issues.pageErrors, "uncaught exceptions").toEqual([]);
      expect(issues.failedRequests.filter((r) => /^5\d\d|FAILED/.test(r)), "server errors / failed requests").toEqual([]);
      expect(issues.failedRequests.filter((r) => /^4\d\d/.test(r)), "client (4xx) API errors").toEqual([]);
    });

    for (const path of FORBIDDEN[role]) {
      test(`${role} cannot access ${path}`, async ({ page }) => {
        await login(page, role);
        await page.goto(path);
        // Compare exact pathnames: "/dashboard" must not match "/counsellor/dashboard".
        await expect
          .poll(() => new URL(page.url()).pathname, { message: `${role} must be redirected away from ${path}`, timeout: 15_000 })
          .not.toBe(path);
      });
    }

    test(`${role} can log out`, async ({ page }) => {
      await login(page, role);
      await expect(page).toHaveURL(ROUTES[role].home, { timeout: 20_000 });
      // Admin and student shells show a direct "Sign out" button; mentor and
      // counsellor shells put it inside the account dropdown.
      const direct = page.getByRole("button", { name: /^sign out$|^log ?out$/i }).first();
      const menuButton = page.getByRole("button", { name: /account menu/i });
      // Wait until the portal shell has rendered one of the two controls.
      await expect(direct.or(menuButton).first()).toBeVisible({ timeout: 20_000 });
      if (await direct.isVisible()) {
        await direct.click();
      } else {
        await page.getByRole("button", { name: /account menu/i }).click();
        await page.getByRole("menuitem", { name: /sign out/i }).click();
      }
      await expect(page).not.toHaveURL(ROUTES[role].home, { timeout: 15_000 });
      // The stored session must actually be cleared (not just the UI state).
      await expect
        .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes("auth-token")).length), {
          message: "Supabase session token should be removed after logout",
          timeout: 15_000,
        })
        .toBe(0);
      await page.goto(ROUTES[role].paths[0]!);
      await expect(page, "protected page must require login again after logout").toHaveURL(/\/(login|admin\/login)/, { timeout: 15_000 });
    });
  });
}
