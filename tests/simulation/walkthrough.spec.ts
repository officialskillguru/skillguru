// Full purchase-to-class walkthrough through the real UI, one browser context
// per person so every role has an independent session. See
// playwright.simulation.config.ts for prerequisites.
import { readFileSync, mkdirSync } from "node:fs";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const DOMAIN = "demo.skillguru.local";
const COURSE_TITLE = "Data Analytics with Python & Power BI";
const COURSE_SLUG = "sim-data-analytics-python-power-bi";
const CLASS_TITLE = "Live Session 1: Python for Analysts";
const SHOTS = "test-results/simulation";
mkdirSync(SHOTS, { recursive: true });

function password(): string {
  const m = readFileSync(".env.demo.local", "utf8").match(/^DEMO_SIM_PASSWORD=(.+)$/m);
  if (!m) throw new Error("Run `npm run demo:reset` first");
  return m[1]!.trim();
}

async function signIn(browser: Browser, who: string, viewport?: { width: number; height: number }): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext(viewport ? { viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 } : {});
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`[${who}] pageerror: ${e.message}`));
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(`${who}@${DOMAIN}`);
  await page.getByLabel("Password", { exact: true }).fill(password());
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  return { ctx, page };
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

/** HH:MM in IST, `minutes` from now, rounded up to 5 minutes and kept before 22:00. */
function istTimeFromNow(minutes: number): string {
  const d = new Date(Date.now() + (330 + minutes) * 60_000);
  let h = d.getUTCHours();
  let m = Math.ceil(d.getUTCMinutes() / 5) * 5;
  if (m === 60) { h += 1; m = 0; }
  if (h >= 22) { h = 21; m = 0; }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

test.describe.serial("counsellor -> student -> teacher walkthrough", () => {
  let counsellor: { ctx: BrowserContext; page: Page };
  let teacher: { ctx: BrowserContext; page: Page };
  let student: { ctx: BrowserContext; page: Page };
  let classRoomPath = "";

  test.afterAll(async () => {
    for (const s of [counsellor, teacher, student]) await s?.ctx.close();
  });

  test("1. counsellor creates a draft that persists and stays out of the catalog", async ({ browser }) => {
    counsellor = await signIn(browser, "counsellor.meera");
    const p = counsellor.page;
    await p.goto("/counsellor/courses");
    await expect(p.getByRole("heading", { name: "Courses", exact: true })).toBeVisible();
    await p.getByRole("button", { name: "New course" }).click();
    const dialog = p.getByRole("dialog");
    await dialog.getByRole("button", { name: "Save as draft" }).click();
    await expect(dialog.getByText("Enter a course title of at least 5 characters.")).toBeVisible();
    await dialog.getByLabel("Course title").fill("Simulation Smoke Course");
    await dialog.getByLabel("Teacher").selectOption({ label: "Vikram Sethi" });
    await dialog.getByLabel("Price (INR)").fill("4999");
    await dialog.getByRole("button", { name: "Save as draft" }).click();
    await p.waitForURL(/\/counsellor\/courses\/[0-9a-f-]{36}$/);
    await p.reload();
    await expect(p.getByRole("heading", { name: "Simulation Smoke Course" })).toBeVisible();
    await expect(p.getByText("Draft", { exact: true }).first()).toBeVisible();
    await shot(p, "01-counsellor-draft-after-refresh");

    // Hidden from the public catalog (anonymous context).
    const anon = await browser.newContext();
    const ap = await anon.newPage();
    await ap.goto("/courses/simulation-smoke-course");
    await expect(ap.getByRole("heading", { name: "Course not found" })).toBeVisible();
    await anon.close();
  });

  test("2. counsellor reviews, publishes and schedules the analytics course", async () => {
    const p = counsellor.page;
    await p.goto("/counsellor/courses");
    await p.getByRole("link", { name: COURSE_TITLE }).click();
    await expect(p.getByRole("heading", { name: "Publishing checklist" })).toBeVisible();
    await expect(p.getByText("To do", { exact: true })).toHaveCount(0);
    await expect(p.getByText("All requirements met. Ready to publish.")).toBeVisible();
    await shot(p, "02-counsellor-checklist");
    await p.getByRole("button", { name: "Publish course" }).click();
    await expect(p.getByRole("link", { name: /View in catalog/ })).toBeVisible();

    await p.getByRole("tab", { name: /Teacher & classes/ }).click();
    await expect(p.getByText(/Teacher: Vikram Sethi/)).toBeVisible();
    await p.getByRole("button", { name: "Schedule class" }).click();
    const dialog = p.getByRole("dialog");
    await dialog.getByLabel("Class title").fill(CLASS_TITLE);
    await dialog.getByLabel("Start (IST)").fill(istTimeFromNow(30));
    await dialog.getByLabel("Duration").selectOption("60");
    await dialog.getByRole("button", { name: "Schedule class" }).click();
    await expect(dialog).toBeHidden();
    await expect(p.getByRole("listitem").filter({ hasText: CLASS_TITLE }).getByText("Scheduled", { exact: true })).toBeVisible();
    await shot(p, "03-counsellor-class-scheduled");
  });

  test("3. assigned teacher sees the scheduled class", async ({ browser }) => {
    teacher = await signIn(browser, "teacher.vikram");
    const p = teacher.page;
    await p.goto("/mentor/live-classes");
    const card = p.getByRole("article").filter({ hasText: CLASS_TITLE });
    await expect(card).toBeVisible();
    await expect(card.getByText("Scheduled")).toBeVisible();
    await shot(p, "04-teacher-sees-class");
  });

  test("4. student finds the course, fails validation, is declined, retries and succeeds", async ({ browser }) => {
    student = await signIn(browser, "student.riya");
    const p = student.page;
    await p.goto("/courses");
    await p.goto(`/courses/${COURSE_SLUG}`);
    await expect(p.getByRole("heading", { name: COURSE_TITLE, level: 1 })).toBeVisible();
    await expect(p.getByText(CLASS_TITLE).first()).toBeVisible();
    await shot(p, "05-student-course-detail");
    await p.getByRole("button", { name: "Enroll Now" }).first().click();
    await p.waitForURL(`**/checkout/${COURSE_SLUG}`);

    // Invalid details keep the student on step 1 with field-level errors.
    await expect(p.getByLabel("Full name")).toHaveValue("Riya Sharma");
    await p.getByLabel("Mobile number").fill("12345");
    await p.getByLabel("City").fill("");
    await p.getByRole("button", { name: "Continue to review" }).click();
    await expect(p.getByText("Please fix the highlighted fields to continue.")).toBeVisible();
    await expect(p.getByText(/10-digit Indian mobile number starting/)).toBeVisible();
    await expect(p.getByText("Enter your city.")).toBeVisible();
    await expect(p.getByLabel("Mobile number")).toHaveAttribute("aria-invalid", "true");
    await shot(p, "06-checkout-invalid-details");
    await p.getByLabel("Mobile number").fill("98765 43210");
    await p.getByLabel("City").fill("Pune");
    await p.getByRole("button", { name: "Continue to review" }).click();
    await expect(p.getByRole("heading", { name: "Review your order" })).toBeVisible();
    await expect(p.getByText("+91 9876543210")).toBeVisible();
    await p.getByRole("button", { name: /Continue to payment/ }).click();
    await expect(p.getByRole("heading", { name: "Payment", exact: true })).toBeVisible();
    await expect(p.getByText("₹14,999").first()).toBeVisible();

    // Declined.
    await p.getByLabel(/Debit \/ Credit card/).check();
    await p.getByLabel("Decline").check();
    await shot(p, "07-checkout-payment-step");
    await p.getByRole("button", { name: /Pay ₹14,999/ }).click();
    await expect(p.getByRole("heading", { name: "Payment declined" })).toBeVisible();
    await shot(p, "08-checkout-declined");

    // No access after the decline.
    const learn = await student.ctx.newPage();
    await learn.goto("/dashboard/live-classes");
    await expect(learn.getByText(CLASS_TITLE)).toHaveCount(0);
    await learn.close();

    // Retry and succeed.
    await p.getByRole("button", { name: "Retry payment" }).click();
    await expect(p.getByRole("heading", { name: "Payment", exact: true })).toBeVisible();
    await p.getByRole("radio", { name: /^UPI/ }).check();
    await p.getByLabel("Approve").check();
    await p.getByRole("button", { name: /Pay ₹14,999/ }).click();
    await expect(p.getByRole("heading", { name: /Payment successful/ })).toBeVisible();
    const receipt = (await p.locator("dd.font-mono").nth(1).textContent())?.trim() ?? "";
    expect(receipt).toMatch(/^SG-INV-/);
    await shot(p, "09-checkout-success");

    // Duplicate confirmations are ignored.
    await p.getByRole("button", { name: "Resend payment confirmation" }).click();
    await expect(p.getByText(/Both duplicate confirmations were recognised and ignored/)).toBeVisible();
    await shot(p, "10-duplicate-confirmation-ignored");
  });

  test("5. after refresh, My Learning, schedule and receipts show the purchase", async () => {
    const p = student.page;
    await p.goto("/dashboard/payments");
    await p.reload();
    const rows = p.getByRole("row").filter({ hasText: COURSE_TITLE });
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "Paid" }).getByText(/SG-INV-/)).toBeVisible();
    await expect(rows.filter({ hasText: "Declined" })).toHaveCount(1);
    await shot(p, "11-payments-and-receipts");

    await p.goto("/dashboard/courses");
    await expect(p.getByText(COURSE_TITLE).first()).toBeVisible();
    await shot(p, "12-my-learning");

    await p.goto("/dashboard/live-classes");
    const card = p.getByRole("article").filter({ hasText: CLASS_TITLE });
    await expect(card.getByText(/Waiting for the teacher to start/)).toBeVisible();
    await expect(card.getByRole("button", { name: "Join class" })).toHaveCount(0);
    await shot(p, "13-student-waiting");
  });

  test("6. teacher starts the class; enrolled student joins; outsider is refused", async ({ browser }) => {
    const t = teacher.page;
    await t.goto("/mentor/live-classes");
    const card = t.getByRole("article").filter({ hasText: CLASS_TITLE });
    await card.getByRole("button", { name: "Start class" }).click();
    const dialog = t.getByRole("dialog");
    await expect(dialog.getByText("Riya Sharma")).toBeVisible();
    await shot(t, "14-teacher-start-confirm");
    await dialog.getByRole("button", { name: "Start class" }).click();
    await t.waitForURL(/\/mentor\/live-classes\/[0-9a-f-]{36}\/room$/);
    classRoomPath = new URL(t.url()).pathname.replace("/mentor/", "/dashboard/");

    const s = student.page;
    const studentCard = s.getByRole("article").filter({ hasText: CLASS_TITLE });
    await expect(studentCard.getByText("Live now")).toBeVisible({ timeout: 20_000 });
    await shot(s, "15-student-sees-live");
    await studentCard.getByRole("button", { name: "Join class" }).click();
    await expect(s.getByRole("heading", { name: CLASS_TITLE })).toBeVisible();
    await s.getByLabel("Message the class").fill("Hello from Riya - excited to start!");
    await s.getByRole("button", { name: "Send message" }).click();
    await expect(s.getByText("Hello from Riya - excited to start!")).toBeVisible();

    // Teacher sees attendance and the shared chat.
    await expect(t.getByRole("complementary", { name: "Attendance" }).getByText("Joined", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(t.getByText("Hello from Riya - excited to start!")).toBeVisible({ timeout: 15_000 });
    await expect(t.getByRole("log", { name: "Chat messages" }).getByText("Riya Sharma", { exact: true })).toBeVisible();
    await expect(t.getByRole("button", { name: "End class" })).toBeInViewport();
    await shot(t, "16-teacher-room-attendance-chat");
    await shot(s, "17-student-room");

    // An unenrolled student opening the room URL directly is refused.
    const outsider = await signIn(browser, "student.neha");
    await outsider.page.goto(classRoomPath);
    await expect(outsider.page.getByRole("heading", { name: "You don't have access to this class" })).toBeVisible();
    await shot(outsider.page, "18-outsider-refused");
    await outsider.ctx.close();

    // Another course's teacher cannot open its classroom controls.
    const other = await signIn(browser, "teacher.kavya");
    await other.page.goto(new URL(t.url()).pathname);
    await expect(other.page.getByRole("heading", { name: /This class isn.t available to you/ })).toBeVisible();
    await other.ctx.close();
  });

  test("7. teacher ends the class; student sees completed; attendance is recorded", async () => {
    const t = teacher.page;
    await t.getByRole("button", { name: "End class" }).click();
    await t.getByRole("dialog").getByRole("button", { name: "End class" }).click();
    await expect(t.getByRole("heading", { name: "Class ended" })).toBeVisible();
    const row = t.getByRole("row").filter({ hasText: "Riya Sharma" });
    await expect(row.getByText("Present")).toBeVisible();
    await shot(t, "19-teacher-attendance");

    const s = student.page;
    await expect(s.getByRole("heading", { name: "This class has ended" })).toBeVisible({ timeout: 20_000 });
    await shot(s, "20-student-class-ended");
  });

  test("8. counsellor sees the purchase against the right course", async () => {
    const p = counsellor.page;
    await p.goto("/counsellor/courses");
    await p.getByRole("link", { name: COURSE_TITLE }).click();
    await p.getByRole("tab", { name: /Enrollments & payments/ }).click();
    const row = p.getByRole("row").filter({ hasText: "Riya Sharma" });
    await expect(row.getByText("Paid")).toBeVisible();
    await expect(row.getByText(/SG-INV-/)).toBeVisible();
    await expect(row.getByText("active", { exact: true })).toBeVisible();
    await expect(row.getByText("UPI", { exact: true })).toBeVisible();
    await shot(p, "21-counsellor-enrollments");
  });

  test("9. mobile layout of the student screens", async ({ browser }) => {
    const mobile = await signIn(browser, "student.aditya", { width: 390, height: 844 });
    const p = mobile.page;
    for (const [path, name] of [
      ["/dashboard/live-classes", "22-mobile-schedule"],
      ["/dashboard/payments", "23-mobile-payments"],
      [`/courses/sim-full-stack-react-node`, "24-mobile-course-detail"],
      ["/checkout/sim-python-for-beginners", "25-mobile-checkout"],
    ] as const) {
      await p.goto(path);
      await p.waitForLoadState("networkidle");
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(1);
      await shot(p, name);
    }
    await mobile.ctx.close();
  });
});
