import { assertServiceResponse, getSupabaseClientOrThrow } from "./_shared";

export type HomeCategory = { id: string; name: string; slug: string; icon: string | null; courseCount: number };
export type HomeStats = { publishedCourses: number; freeCourses: number; categoriesWithCourses: number };

type CategoryEmbedRow = {
  price: number | null;
  course_categories: { categories: { id: string; name: string; slug: string; icon: string | null } | null }[];
};

/**
 * Live, anonymous-safe numbers and category counts for the public homepage.
 * Everything is computed from published, non-deleted courses — the homepage
 * never shows hardcoded marketing statistics.
 */
export async function getHomeOverview(): Promise<{ stats: HomeStats; categories: HomeCategory[] }> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("courses")
    .select("price, course_categories(categories(id, name, slug, icon))")
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(1000)
    .returns<CategoryEmbedRow[]>();
  assertServiceResponse(error);

  const rows = data ?? [];
  const counts = new Map<string, HomeCategory>();
  for (const row of rows) {
    for (const embed of row.course_categories ?? []) {
      const cat = embed.categories;
      if (!cat) continue;
      const entry = counts.get(cat.id) ?? { ...cat, courseCount: 0 };
      entry.courseCount += 1;
      counts.set(cat.id, entry);
    }
  }

  const categories = [...counts.values()].sort((a, b) => b.courseCount - a.courseCount || a.name.localeCompare(b.name));
  return {
    stats: {
      publishedCourses: rows.length,
      freeCourses: rows.filter((r) => !r.price).length,
      categoriesWithCourses: categories.length,
    },
    categories,
  };
}
