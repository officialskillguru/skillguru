/**
 * Category accent colours used for course artwork fallbacks. Kept in one place
 * so cards, detail headers and generated thumbnails stay visually consistent.
 * Unknown categories fall back to the brand electric blue.
 */
const CATEGORY_ACCENTS: Record<string, string> = {
  "web-development": "#3B82F6",
  "data-science-ai": "#8B5CF6",
  programming: "#06B6D4",
  "ui-ux-design": "#EC4899",
  "digital-marketing": "#F59E0B",
  cybersecurity: "#10B981",
  "business-entrepreneurship": "#6366F1",
  "cloud-devops": "#0EA5E9",
  "finance-management": "#14B8A6",
  "communication-career-skills": "#F97316",
};

export const DEFAULT_COURSE_ACCENT = "#3B82F6";

export function courseAccent(categorySlug: string | null | undefined): string {
  return (categorySlug && CATEGORY_ACCENTS[categorySlug]) || DEFAULT_COURSE_ACCENT;
}
