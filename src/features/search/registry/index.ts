import { registerMentors } from "./registerMentors";
import { SearchRegistry } from "../core/SearchRegistry";
import type { SearchRecord } from "../types";
import { listPublishedCourses } from "@/services/courses.service";
import { resolveFileUrl } from "@/services/storage.service";
import { faqs } from "@/data/platform";

export function initializeSearchRegistry() {
  registerMentors();

  // 1. Register Courses - real published courses only, never draft/under_review/archived
  // (listPublishedCourses hardcodes status='published' server-side).
  SearchRegistry.register("courses", async () => {
    const { data: publishedCourses } = await listPublishedCourses({ pageSize: 100 });

    const records = await Promise.all(
      publishedCourses.map(async (c): Promise<SearchRecord> => {
        const image = c.thumbnail_file_id ? await resolveFileUrl(c.thumbnail_file_id).catch(() => null) : null;
        const categoryName = c.course_categories[0]?.categories?.name ?? undefined;
        return {
          id: `course_${c.slug}`,
          type: "course",
          title: c.title,
          subtitle: categoryName,
          description: c.short_description ?? c.description ?? undefined,
          category: "Courses",
          url: `/courses/${c.slug}`,
          image: image ?? undefined,
          keywords: [categoryName, c.level, c.language].filter((v): v is string => !!v),
          popularity: 90,
        };
      })
    );
    return records;
  });

  // 2. Register FAQs - the same static FAQ copy already shown on the public
  // FAQ/contact pages (src/data/platform.ts `faqs`), not a separate
  // fabricated single entry that didn't match what the site actually shows.
  SearchRegistry.register("faqs", () => {
    return faqs.map((f, index): SearchRecord => ({
      id: `faq_${index}`,
      type: "faq",
      title: f.question,
      description: f.answer,
      category: "FAQ",
      url: "/faq",
      icon: "HelpCircle",
      keywords: f.question.toLowerCase().split(/\s+/),
      popularity: 60,
    }));
  });
}
