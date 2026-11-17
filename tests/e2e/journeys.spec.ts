import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { credentials, login } from "./helpers";

dotenv.config({ quiet: true });

// Service-role client used ONLY for test-data cleanup (Node side, never the browser).
const service = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const RUN = `E2E ${Date.now()}`;

test.describe.configure({ mode: "serial" });

test.describe("student journey", () => {
  test.skip(!credentials("student"), "no student credentials");
  const FREE_SLUG = "git-github-developers";

  test.afterAll(async () => {
    // Remove only the enrollment this test created so the run is repeatable.
    const { data: course } = await service.from("courses").select("id").eq("slug", FREE_SLUG).single();
    const { data: student } = await service.from("profiles").select("id").eq("email", "student@skillguru.local").single();
    if (course && student) {
      const { data: enr } = await service.from("enrollments").select("id").eq("course_id", course.id).eq("student_id", student.id);
      for (const e of enr ?? []) {
        await service.from("lesson_progress").delete().eq("enrollment_id", e.id);
        await service.from("enrollments").delete().eq("id", e.id);
      }
    }
  });

  test("visitor clicks Enroll, signs in, returns to the course and enrolls", async ({ page }) => {
    const creds = credentials("student")!;
    await page.goto(`/courses/${FREE_SLUG}`);
    await page.getByRole("button", { name: /Enroll Free/i }).first().click();
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await page.getByLabel("Email Address").fill(creds.email);
    await page.getByLabel("Password", { exact: true }).fill(creds.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page, "should return to the course after login").toHaveURL(new RegExp(`/courses/${FREE_SLUG}$`), { timeout: 20_000 });

    await page.getByRole("button", { name: /Enroll Free/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/courses\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByRole("navigation", { name: "Course modules" })).toBeVisible();
  });

  test("enrolled student opens a lesson and marks it complete", async ({ page }) => {
    await login(page, "student");
    await page.goto("/dashboard/courses");
    // The review student's persistent enrollment (created by scripts/qa/rls-crud-check.mjs via enroll-free).
    const card = page.locator("div, article").filter({ hasText: "HTML and CSS for Absolute Beginners" }).filter({ has: page.getByRole("link", { name: /Go to Course/i }) }).last();
    await card.getByRole("link", { name: /Go to Course/i }).click();
    const nav = page.getByRole("navigation", { name: "Course modules" });
    await expect(nav).toBeVisible({ timeout: 20_000 });
    const before = await page.getByLabel("Course completion").getAttribute("aria-valuenow");
    await nav.getByRole("button", { name: /Headings, paragraphs, links and images/i }).click();
    await expect(page.getByRole("heading", { name: /Headings, paragraphs, links and images/i }).first()).toBeVisible();
    const complete = page.getByRole("button", { name: /mark (as )?complete/i }).first();
    if (await complete.isVisible().catch(() => false)) {
      await complete.click();
      await expect(page.getByLabel("Course completion")).not.toHaveAttribute("aria-valuenow", before ?? "", { timeout: 15_000 });
    } else {
      // Already completed on a previous run - the lesson must show as completed instead.
      await expect(page.getByText(/completed/i).first()).toBeVisible();
    }
  });

  test("student wishlist and certificates pages load real data states", async ({ page }) => {
    await login(page, "student");
    await page.goto("/dashboard/wishlist");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.goto("/dashboard/certificates");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
});

test.describe("teacher journey", () => {
  test.skip(!credentials("teacher"), "no teacher credentials");
  const title = `${RUN} Teacher Course`;

  test.afterAll(async () => {
    const { data: courses } = await service.from("courses").select("id").like("title", `${RUN}%`);
    for (const c of courses ?? []) {
      const { data: mods } = await service.from("modules").select("id").eq("course_id", c.id);
      for (const m of mods ?? []) await service.from("lessons").delete().eq("module_id", m.id);
      await service.from("modules").delete().eq("course_id", c.id);
      await service.from("course_mentors").delete().eq("course_id", c.id);
      await service.from("course_categories").delete().eq("course_id", c.id);
      await service.from("courses").delete().eq("id", c.id);
    }
  });

  test("teacher creates a course, then adds a module and a lesson", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "teacher");
    await page.goto("/mentor/courses/new");
    const titleInput = page.getByLabel(/Course Title/i);
    await titleInput.fill("ab");
    await expect(page.getByRole("button", { name: "Save & Continue" }), "title under 4 chars must not be savable").toBeDisabled();
    await titleInput.fill(title);
    await page.getByRole("button", { name: "Save & Continue" }).click();
    await expect(page).toHaveURL(/\/mentor\/courses\/[0-9a-f-]{36}\/edit/, { timeout: 20_000 });

    await page.getByRole("button", { name: /Curriculum/ }).first().click();
    await page.getByRole("button", { name: /Add New Module/i }).click();
    await page.getByLabel("Module title").fill("Getting started");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Getting started").first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Add Lesson" }).first().click();
    await page.getByLabel("Lesson title").fill("Welcome lesson");
    await page.getByLabel("Lesson content").fill("Welcome to the course.");
    await page.getByRole("button", { name: "Save Lesson" }).click();
    await expect(page.getByText("Welcome lesson").first()).toBeVisible({ timeout: 15_000 });

    // Persisted in the database, owned by the teacher, still a draft.
    const { data } = await service.from("courses").select("status, modules(title, lessons(title))").eq("title", title).single();
    expect(data?.status).toBe("draft");
    expect(JSON.stringify(data)).toContain("Welcome lesson");
  });

  test("teacher's course list shows the new draft", async ({ page }) => {
    await login(page, "teacher");
    await page.goto("/mentor/courses");
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("admin journey", () => {
  test.skip(!credentials("admin"), "no admin credentials");

  test("admin course management lists and searches the demo catalogue", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/courses");
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill("Kubernetes");
    await expect(page.getByText("Docker and Kubernetes for Developers").first()).toBeVisible({ timeout: 20_000 });
  });

  test("admin sees students, teachers, counsellors and categories", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/users");
    await expect(page.getByText("student@skillguru.local").first()).toBeVisible({ timeout: 20_000 });
    await page.goto("/admin/users/teachers");
    // 11 teachers (10 demo instructors + review teacher) with 10 rows per page: use search.
    await page.getByPlaceholder(/Search teachers/i).fill("teacher@skillguru.local");
    await expect(page.getByText("teacher@skillguru.local").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("demo.instructor.webdev@skillguru.local")).toHaveCount(0);
    await page.goto("/admin/users/counsellors");
    await expect(page.getByText("counsellor@skillguru.local").first()).toBeVisible({ timeout: 20_000 });
    await page.goto("/admin/courses/categories");
    await expect(page.getByText("Web Development").first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("counsellor journey", () => {
  test.skip(!credentials("counsellor"), "no counsellor credentials");
  const leadName = `${RUN} Lead`;

  test.afterAll(async () => {
    const { data: leads } = await service.from("leads").select("id").like("name", `${RUN}%`);
    for (const l of leads ?? []) {
      for (const t of ["lead_followups", "lead_notes", "lead_activities"]) await service.from(t).delete().eq("lead_id", l.id);
      await service.from("leads").delete().eq("id", l.id);
    }
  });

  test("counsellor creates a lead, changes its status, schedules a follow-up and adds a note", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, "counsellor");
    await page.goto("/counsellor/leads");
    await page.getByRole("button", { name: "New lead" }).first().click();

    // Validation: name required, email format checked.
    await page.getByRole("button", { name: "Create lead" }).click();
    await expect(page.getByText("Name is required.")).toBeVisible();
    await page.getByLabel("Full name *").fill(leadName);
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Create lead" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await page.getByLabel("Email").fill("prospect@example.com");
    await page.getByRole("button", { name: "Create lead" }).click();
    await expect(page.getByRole("cell", { name: new RegExp(leadName) })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: `Open lead ${leadName}` }).click();
    await page.getByLabel("Counselling status").selectOption("contacted");
    await expect(page.getByText(/Status set to Contacted/)).toBeVisible();

    await page.getByLabel("When").fill("2030-01-15T10:30");
    await page.getByRole("button", { name: "Schedule" }).click();
    await expect(page.getByRole("button", { name: "Mark done" })).toBeVisible();
    await page.getByRole("button", { name: "Mark done" }).click();
    await expect(page.getByText("Completed").first()).toBeVisible();

    await page.getByLabel("Add a note").fill("Interested in weekend batches.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Interested in weekend batches.")).toBeVisible();

    const { data } = await service.from("leads").select("status, lead_followups(status), lead_notes(content)").eq("name", leadName).single();
    expect(data?.status).toBe("contacted");
    expect(JSON.stringify(data)).toContain("completed");
  });
});
