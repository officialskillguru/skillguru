// Regression smoke for screens next to the simulation flow: every portal page
// must render without an uncaught error or the app error boundary. Read-only.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const DOMAIN = "demo.skillguru.local";

function password(): string {
  const m = readFileSync(".env.demo.local", "utf8").match(/^DEMO_SIM_PASSWORD=(.+)$/m);
  if (!m) throw new Error("Run `npm run demo:reset` first");
  return m[1]!.trim();
}

async function signIn(page: Page, who: string) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(`${who}@${DOMAIN}`);
  await page.getByLabel("Password", { exact: true }).fill(password());
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

const ROUTES: Record<string, string[]> = {
  "student.aditya": [
    "/dashboard",
    "/dashboard/courses",
    "/dashboard/assignments",
    "/dashboard/notes",
    "/dashboard/live-classes",
    "/dashboard/payments",
    "/dashboard/certificates",
    "/dashboard/profile",
    "/dashboard/resume-builder",
    "/dashboard/placement",
    "/dashboard/career-guidance",
    "/dashboard/mentors",
    "/dashboard/wishlist",
    "/courses",
  ],
  "teacher.vikram": [
    "/mentor/overview",
    "/mentor/courses",
    "/mentor/students",
    "/mentor/tasks",
    "/mentor/reviews",
    "/mentor/live-classes",
    "/mentor/jobs",
    "/mentor/messages",
    "/mentor/announcements",
    "/mentor/notifications",
    "/mentor/analytics",
    "/mentor/profile",
  ],
  "counsellor.meera": [
    "/counsellor/dashboard",
    "/counsellor/students",
    "/counsellor/leads",
    "/counsellor/mentors",
    "/counsellor/courses",
    "/counsellor/jobs",
    "/counsellor/messages",
    "/counsellor/profile",
  ],
};

for (const [who, paths] of Object.entries(ROUTES)) {
  test(`${who}: adjacent screens open without errors`, async ({ page }) => {
    test.setTimeout(240_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
    await signIn(page, who);
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page, `${path} should not redirect to login`).not.toHaveURL(/\/login/);
      await expect(page.getByText("Something went wrong", { exact: false }), `${path} error boundary`).toHaveCount(0);
      await expect(page.locator("main, [role=main]").first(), `${path} renders`).toBeVisible();
    }
    expect(pageErrors, "uncaught page errors").toEqual([]);
  });
}
