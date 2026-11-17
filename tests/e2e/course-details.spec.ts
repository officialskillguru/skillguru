import { expect, test } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

type CourseRef = { slug: string; title: string };

/** Published demo courses, fetched with the public anon key (same visibility as a visitor). */
async function publishedDemoCourses(): Promise<CourseRef[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const tags = (await (await fetch(`${url}/rest/v1/tags?slug=eq.demo-content&select=id`, { headers })).json()) as { id: string }[];
  const tagId = tags[0]?.id;
  if (!tagId) throw new Error("demo-content tag not found - run scripts/demo-seed/seed-demo-courses.mjs");
  const res = await fetch(
    `${url}/rest/v1/courses?select=slug,title,course_tags!inner(tag_id)&status=eq.published&course_tags.tag_id=eq.${tagId}&limit=200`,
    { headers },
  );
  return (await res.json()) as CourseRef[];
}

test("all 100 demo courses have working detail pages", async ({ page }) => {
  test.setTimeout(900_000);
  const courses = await publishedDemoCourses();
  expect(courses.length, "published demo courses").toBe(100);

  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(`${page.url()} :: ${err.message}`));

  const failures: string[] = [];
  for (const course of courses) {
    await page.goto(`/courses/${course.slug}`);
    try {
      await expect(page.getByRole("heading", { level: 1, name: course.title })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/What You.ll Learn/i).first()).toBeVisible();
    } catch {
      failures.push(course.slug);
    }
  }
  expect(failures, "course detail pages that failed to render").toEqual([]);
  expect(pageErrors, "uncaught exceptions on detail pages").toEqual([]);
});
