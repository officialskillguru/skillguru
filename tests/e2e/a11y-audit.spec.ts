// Lightweight accessibility audit across every route (no axe dependency).
// Reports per page: h1 count, unnamed buttons/links, unlabeled form fields,
// images without alt. Fails on any violation so regressions are caught.
import { expect, test, type Page } from "@playwright/test";
import { credentials, login, type Role } from "./helpers";

const PUBLIC = ["/", "/courses", "/courses/full-stack-react-node", "/about", "/mentors", "/placements", "/guidance", "/contact", "/login", "/signup", "/forgot-password", "/verify-certificate"];
const AREAS: Record<Role, string[]> = {
  student: ["/dashboard", "/dashboard/courses", "/dashboard/certificates", "/dashboard/payments", "/dashboard/profile", "/dashboard/wishlist", "/dashboard/notes", "/dashboard/mentors", "/dashboard/support", "/dashboard/assignments", "/dashboard/live-classes", "/dashboard/placement", "/dashboard/resume-builder", "/dashboard/career-guidance", "/dashboard/chat"],
  teacher: ["/mentor/overview", "/mentor/courses", "/mentor/courses/new", "/mentor/students", "/mentor/tasks", "/mentor/reviews", "/mentor/jobs", "/mentor/analytics", "/mentor/messages", "/mentor/announcements", "/mentor/notifications", "/mentor/live-classes", "/mentor/profile"],
  counsellor: ["/counsellor/dashboard", "/counsellor/students", "/counsellor/leads", "/counsellor/mentors", "/counsellor/courses", "/counsellor/jobs", "/counsellor/messages", "/counsellor/profile"],
  admin: ["/admin", "/admin/users", "/admin/users/teachers", "/admin/users/counsellors", "/admin/courses", "/admin/courses/categories", "/admin/crm", "/admin/commerce/payments", "/admin/communication/notifications", "/admin/analytics", "/admin/settings"],
};

async function audit(page: Page, path: string): Promise<string[]> {
  await page.goto(path);
  await expect.poll(async () => (await page.locator("body").innerText()).trim().length, { timeout: 20_000 }).toBeGreaterThan(40);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  return page.evaluate((p) => {
    const issues: string[] = [];
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    };
    const name = (el: Element) =>
      (el.getAttribute("aria-label") ||
        (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ") ||
        (el as HTMLElement).innerText ||
        el.getAttribute("title") ||
        [...el.querySelectorAll("img[alt],svg title")].map((i) => i.getAttribute("alt") ?? i.textContent).join(" ") ||
        "").trim();
    const h1s = [...document.querySelectorAll("h1")].filter(visible);
    if (h1s.length !== 1) issues.push(`${p}: ${h1s.length} visible <h1> elements`);
    for (const el of [...document.querySelectorAll("button, a[href], [role=button]")].filter(visible)) {
      if (!name(el)) issues.push(`${p}: unnamed ${el.tagName.toLowerCase()} ${(el as HTMLElement).outerHTML.slice(0, 120)}`);
    }
    for (const el of [...document.querySelectorAll("input:not([type=hidden]), select, textarea")].filter(visible)) {
      const id = el.id;
      const labelled = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest("label");
      if (!labelled) issues.push(`${p}: unlabeled ${el.tagName.toLowerCase()} ${(el as HTMLElement).outerHTML.slice(0, 120)}`);
    }
    for (const img of [...document.querySelectorAll("img")].filter(visible)) {
      if (!img.hasAttribute("alt")) issues.push(`${p}: <img> without alt ${img.src.slice(0, 80)}`);
    }
    return issues;
  }, path);
}

test("public pages pass the accessibility audit", async ({ page }) => {
  test.setTimeout(300_000);
  const issues: string[] = [];
  for (const p of PUBLIC) issues.push(...(await audit(page, p)));
  console.log(issues.join("\n"));
  expect(issues).toEqual([]);
});

for (const role of Object.keys(AREAS) as Role[]) {
  test(`${role} pages pass the accessibility audit`, async ({ page }) => {
    test.skip(!credentials(role), `no ${role} credentials`);
    test.setTimeout(300_000);
    await login(page, role);
    const issues: string[] = [];
    for (const p of AREAS[role]) issues.push(...(await audit(page, p)));
    console.log(issues.join("\n"));
    expect(issues).toEqual([]);
  });
}
