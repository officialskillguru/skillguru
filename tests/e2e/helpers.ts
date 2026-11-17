import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";

export type Role = "admin" | "counsellor" | "student" | "teacher";

const EMAILS: Record<Role, string> = {
  admin: "admin@skillguru.local",
  counsellor: "counsellor@skillguru.local",
  student: "student@skillguru.local",
  teacher: "teacher@skillguru.local",
};

/**
 * Review-account passwords come from env vars (E2E_ADMIN_PASSWORD, ...) or the
 * git-ignored SKILLGURU_REVIEW_CREDENTIALS.txt. They are never logged.
 */
export function credentials(role: Role): { email: string; password: string } | null {
  const email = EMAILS[role];
  const fromEnv = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];
  if (fromEnv) return { email, password: fromEnv };
  const file = join(process.cwd(), "SKILLGURU_REVIEW_CREDENTIALS.txt");
  if (!existsSync(file)) return null;
  const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.includes(` ${email} `) || l.includes(`${email}\t`));
  const password = line?.trim().split(/\s+/).pop();
  return password && password !== email ? { email, password } : null;
}

export async function login(page: Page, role: Role) {
  const creds = credentials(role);
  if (!creds) throw new Error(`No credentials available for ${role}`);
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(creds.email);
  await page.getByLabel("Password", { exact: true }).fill(creds.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
}

// Console noise that is not an application defect (browser/devtools/media).
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /favicon/i,
  /The play\(\) request was interrupted/i,
  /ResizeObserver loop/i,
];

export type PageIssues = { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] };

/** Collects runtime problems for the lifetime of the page. */
export function trackIssues(page: Page): PageIssues {
  const issues: PageIssues = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    issues.consoleErrors.push(`${page.url()} :: ${text.slice(0, 300)}`);
  });
  page.on("pageerror", (err) => issues.pageErrors.push(`${page.url()} :: ${err.message.slice(0, 300)}`));
  page.on("response", (res) => {
    const status = res.status();
    const url = res.url();
    if (status < 400) return;
    // Only first-party app/API traffic; ignore third-party analytics.
    if (!url.includes("supabase.co") && !url.includes("127.0.0.1") && !url.includes("localhost")) return;
    issues.failedRequests.push(`${status} ${res.request().method()} ${url.replace(/\?.*$/, "")}`);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (!url.includes("supabase.co")) return;
    const failure = req.failure()?.errorText ?? "";
    if (/ERR_ABORTED/i.test(failure)) return; // navigation cancelled in-flight requests
    issues.failedRequests.push(`FAILED ${req.method()} ${url.replace(/\?.*$/, "")} ${failure}`);
  });
  return issues;
}

export async function attachIssues(testInfo: TestInfo, issues: PageIssues) {
  await testInfo.attach("runtime-issues.json", { body: JSON.stringify(issues, null, 2), contentType: "application/json" });
}

/** Visits a route and asserts it rendered real content (no 404, no crash screen). */
export async function expectRouteRenders(page: Page, path: string) {
  await page.goto(path);
  // networkidle can fire while the auth bootstrap spinner (no text) is still
  // showing, so poll for real rendered content instead.
  await expect
    .poll(async () => (await page.locator("body").innerText()).trim().length, {
      message: `${path} rendered an empty page`,
      timeout: 20_000,
    })
    .toBeGreaterThan(40);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await expect(page.getByText(/page not found/i).first(), `${path} rendered a not-found page`).toHaveCount(0);
  await expect(page.getByText(/something went wrong/i).first(), `${path} rendered an error boundary`).toHaveCount(0);
}
