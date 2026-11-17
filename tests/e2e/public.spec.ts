import { expect, test } from "@playwright/test";
import { attachIssues, expectRouteRenders, trackIssues } from "./helpers";

test.describe("public website", () => {
  test("homepage shows live catalogue data and working CTAs", async ({ page }, testInfo) => {
    const issues = trackIssues(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Degrees open doors/i })).toBeVisible();

    // Live stats come from the database, not hardcoded numbers.
    const stats = page.getByRole("region", { name: /SkillGuru at a glance/i }).or(page.locator("section[aria-labelledby='home-stats-heading']"));
    await expect(stats.getByText("Published courses")).toBeVisible();

    // Categories and featured courses link to real catalogue pages.
    await expect(page.getByRole("heading", { name: /Browse by category/i })).toBeVisible();
    const firstCategory = page.locator("#home-categories-heading").locator("xpath=ancestor::section").getByRole("link").filter({ hasText: /course/ }).first();
    await expect(firstCategory).toBeVisible();
    await expect(page.getByRole("heading", { name: /Featured courses/i })).toBeVisible();
    const courseLinks = page.locator("section[aria-labelledby='home-courses-heading'] a[href^='/courses/']");
    await expect(courseLinks.first()).toBeVisible();

    await page.getByRole("link", { name: /^Explore Courses/i }).first().click();
    await expect(page).toHaveURL(/\/courses$/);
    await attachIssues(testInfo, issues);
    expect(issues.pageErrors, "uncaught exceptions").toEqual([]);
  });

  test("/faq scrolls to a real FAQ section that expands", async ({ page }) => {
    await page.goto("/faq");
    const faq = page.locator("#faq");
    await expect(faq.getByRole("heading", { name: /Frequently asked questions/i })).toBeVisible();
    const trigger = faq.getByRole("button", { name: /Are the courses in the catalogue real/i });
    await trigger.click();
    await expect(faq.getByText(/clearly marked with a “Demo” badge/i)).toBeVisible();
  });

  test("catalogue search, filters, sorting and pagination change results", async ({ page }) => {
    await page.goto("/courses");
    const summary = page.getByText(/^Showing \d+–\d+ of \d+ courses?$/);
    await expect(summary).toBeVisible();
    const total = Number((await summary.innerText()).match(/of (\d+)/)![1]);
    expect(total).toBeGreaterThanOrEqual(100);

    // Search by title.
    await page.getByPlaceholder(/Search courses/i).fill("Kubernetes");
    await expect(page.getByRole("heading", { name: /Docker and Kubernetes for Developers/i })).toBeVisible();

    // Search with no results shows the empty state.
    await page.getByPlaceholder(/Search courses/i).fill("zzqx-no-such-course");
    await expect(page.getByText(/No courses match your filters/i)).toBeVisible();
    await page.getByRole("button", { name: /Clear all filters/i }).first().click();
    await expect(summary).toBeVisible();

    // Category filter via URL (what the homepage category tiles link to).
    await page.goto("/courses?category=cybersecurity");
    await expect(page.getByText(/^Showing 1–10 of 10 courses$/)).toBeVisible();

    // Level + price filters.
    await page.goto("/courses");
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByLabel("Price", { exact: true }).selectOption("free");
    // Wait for the filtered result set (count differs from the unfiltered total).
    await expect(page.getByText(new RegExp(`^Showing 1–\\d+ of (?!${total}\\b)\\d+ courses?$`))).toBeVisible();
    const freeCount = Number((await page.getByText(/^Showing/).innerText()).match(/of (\d+)/)![1]);
    expect(freeCount).toBeGreaterThan(0);
    expect(freeCount).toBeLessThan(total);
    {
      const price = page.locator("article").first().getByText("Free", { exact: true });
      await price.scrollIntoViewIfNeeded();
      await expect(price).toBeVisible();
    }

    // Skill filter.
    await page.getByLabel("Price", { exact: true }).selectOption("");
    await page.getByLabel("Skill", { exact: true }).selectOption("figma");
    // Wait for the filtered result set to replace the unfiltered one.
    await expect(page.getByText(new RegExp(`^Showing 1–\\d+ of (?!${total}\\b)\\d+ courses?$`))).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Modern UI\/UX Design with Figma/i })).toBeVisible({ timeout: 15_000 });

    // Sorting by price low→high puts a free course first.
    await page.goto("/courses?sort=price_asc");
    {
      const price = page.locator("article").first().getByText("Free", { exact: true });
      await price.scrollIntoViewIfNeeded();
      await expect(price).toBeVisible();
    }

    // Pagination.
    await page.goto("/courses");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/^Showing 13–24 of/)).toBeVisible();
  });

  test("course detail shows outcomes, curriculum and enrollment CTA", async ({ page }) => {
    await page.goto("/courses/full-stack-react-node");
    await expect(page.getByRole("heading", { name: /Complete Full-Stack Development with React and Node.js/i }).first()).toBeVisible();
    await expect(page.getByText(/Design a React front end with reusable components/i).first()).toBeVisible();
    await expect(page.getByText(/React Fundamentals/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /enrol|enroll|buy|start/i }).or(page.getByRole("link", { name: /enrol|enroll|buy|start/i })).first()).toBeVisible();
  });

  test("unknown course slug shows a not-found state, not a crash", async ({ page }) => {
    const issues = trackIssues(page);
    await page.goto("/courses/this-course-does-not-exist");
    await expect(page.getByText(/not found|no longer available|doesn.t exist/i).first()).toBeVisible();
    expect(issues.pageErrors).toEqual([]);
  });

  test("public marketing and auth routes render", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const issues = trackIssues(page);
    for (const path of ["/", "/courses", "/about", "/mentors", "/placements", "/guidance", "/contact", "/verify-certificate", "/privacy-policy", "/terms", "/refund-policy", "/login", "/signup", "/forgot-password"]) {
      await expectRouteRenders(page, path);
    }
    await attachIssues(testInfo, issues);
    expect(issues.pageErrors, "uncaught exceptions").toEqual([]);
  });

  test("unknown routes show the 404 page", async ({ page }) => {
    await page.goto("/definitely-not-a-route");
    await expect(page.getByText(/not found|404/i).first()).toBeVisible();
  });

  test("login rejects invalid credentials with a visible error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email Address").fill("nobody@skillguru.local");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password-123");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/invalid|incorrect|wrong/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("login validates email format before submitting", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email Address").fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("x");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/valid email/i).first()).toBeVisible();
  });

  test("protected routes redirect anonymous users to login", async ({ page }) => {
    for (const path of ["/dashboard", "/admin", "/mentor", "/counsellor"]) {
      await page.goto(path);
      await expect(page, `${path} should require login`).toHaveURL(/\/(login|admin\/login)/);
    }
  });
});
