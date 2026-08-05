import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { GsapReveal } from "@/components/motion/gsap-reveal";
import { PublicCourseCard } from "@/components/cards/PublicCourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/hooks/usePageMeta";
import { listPublicCategories, listPublishedCourses, type PublicCourseFilters } from "@/services/courses.service";

const LEVEL_OPTIONS = [
  { value: "", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all_levels", label: "All Levels (course)" },
];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function CoursesPage() {
  usePageMeta("Courses & Career Tracks");
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const search = useDebouncedValue(searchInput, 300);
  const categorySlug = searchParams.get("category") ?? "";
  const level = searchParams.get("level") ?? "";
  const language = searchParams.get("language") ?? "";
  const courseType = searchParams.get("type") ?? "";
  const freeOnly = searchParams.get("free") === "1";
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const { data: categories } = useQuery({
    queryKey: ["public-categories"],
    queryFn: listPublicCategories,
    staleTime: 5 * 60 * 1000,
  });

  const filters: PublicCourseFilters = {
    search: search || undefined,
    categorySlug: categorySlug || undefined,
    level: level || undefined,
    language: language || undefined,
    courseType: courseType || undefined,
    freeOnly: freeOnly || undefined,
    page,
    pageSize: 12,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-courses", filters],
    queryFn: () => listPublishedCourses(filters),
    placeholderData: (prev) => prev,
  });

  const activeCategory = categories?.flatMap((c) => [c, ...c.subcategories]).find((c) => c.slug === categorySlug);

  const languageOptions = Array.from(
    new Set((data?.data ?? []).map((c) => c.language).filter((v): v is string => !!v))
  );
  const typeOptions = Array.from(
    new Set((data?.data ?? []).map((c) => c.course_type).filter((v): v is string => !!v))
  );

  const hasActiveFilters = !!(categorySlug || level || language || courseType || freeOnly || search);

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams({}, { replace: true });
    setPage(1);
  };

  return (
    <main id="main-content" className="bg-background">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GsapReveal>
            <p className="text-sm font-black uppercase tracking-[0.15em] text-secondary">Courses</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-5xl">
              {activeCategory ? activeCategory.name : "Find your next career track"}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold text-muted-foreground">
              Browse real, admin-approved courses across every category, taught by working industry mentors.
            </p>
          </GsapReveal>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="courses-search" className="sr-only">Search courses</label>
              <input
                id="courses-search"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search courses, skills, mentors..."
                className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-secondary focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold text-primary shadow-sm transition hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {hasActiveFilters && <span className="ml-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-black text-primary">•</span>}
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="filter-category" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Category</label>
                <select
                  id="filter-category"
                  value={categorySlug}
                  onChange={(e) => setParam("category", e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-muted px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All Categories</option>
                  {(categories ?? []).map((cat) => (
                    <optgroup key={cat.id} label={cat.name}>
                      <option value={cat.slug}>{cat.name} (all)</option>
                      {cat.subcategories.map((sub) => (
                        <option key={sub.id} value={sub.slug}>{sub.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-level" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Level</label>
                <select
                  id="filter-level"
                  value={level}
                  onChange={(e) => setParam("level", e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-muted px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-language" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Language</label>
                <select
                  id="filter-language"
                  value={language}
                  onChange={(e) => setParam("language", e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-muted px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Any Language</option>
                  {languageOptions.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-type" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Course Type</label>
                <select
                  id="filter-type"
                  value={courseType}
                  onChange={(e) => setParam("type", e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-muted px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Any Type</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={freeOnly}
                  onChange={(e) => setParam("free", e.target.checked ? "1" : "")}
                  className="size-4 rounded border-border"
                />
                Free courses only
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm font-bold text-secondary hover:underline"
                >
                  <X className="size-4" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] rounded-xl" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-center">
            <p className="text-base font-bold text-destructive-text">Couldn't load courses.</p>
            <button type="button" onClick={() => void refetch()} className="mt-3 rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold text-primary hover:bg-muted">
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && (data?.data.length ?? 0) === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-14 text-center">
            <p className="text-lg font-black text-primary">No courses match your filters.</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">Try clearing a filter or searching a different term.</p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && (data?.data.length ?? 0) > 0 && (
          <>
            <p className="mb-6 text-sm font-semibold text-muted-foreground">
              Showing {data!.data.length} of {data!.count} course{data!.count === 1 ? "" : "s"}
            </p>
            <GsapReveal stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data!.data.map((course) => (
                <PublicCourseCard key={course.id} course={course} />
              ))}
            </GsapReveal>

            {data!.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-sm font-bold text-muted-foreground">Page {page} of {data!.totalPages}</span>
                <button
                  type="button"
                  disabled={page >= data!.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
