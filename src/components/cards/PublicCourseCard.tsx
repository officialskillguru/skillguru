import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Star, Users } from "lucide-react";

import type { PublicCourseRow } from "@/services/courses.service";
import { resolveFileUrl } from "@/services/storage.service";
import { courseDetailRoute } from "@/lib/routes";

const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";

function formatPrice(value: number | null) {
  if (!value) return "Free";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" }).format(value);
}

function levelLabel(level: string | null) {
  switch (level) {
    case "beginner": return "Beginner";
    case "intermediate": return "Intermediate";
    case "advanced": return "Advanced";
    case "all_levels": return "All Levels";
    default: return null;
  }
}

/**
 * Real-data course card, used by the public /courses catalogue and the
 * course-detail "related courses" rail. Distinct from CourseCard.tsx, which
 * stays wired to the HomePage's mock @/data/platform course shape - out of
 * scope for this phase.
 */
export function PublicCourseCard({ course }: Readonly<{ course: PublicCourseRow }>) {
  const { data: thumbnailUrl } = useQuery({
    queryKey: ["file-url", course.thumbnail_file_id],
    queryFn: () => resolveFileUrl(course.thumbnail_file_id ?? ""),
    enabled: !!course.thumbnail_file_id,
    staleTime: 5 * 60 * 1000,
  });

  const categoryName = course.course_categories.find((cc) => cc.categories)?.categories?.name ?? null;
  const level = levelLabel(course.level);
  const hasDiscount = course.discount_price != null && course.price != null && course.discount_price < course.price;
  const detailHref = courseDetailRoute(course.slug);

  return (
    <article className="premium-surface group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-accent/45 hover:shadow-md">
      <Link to={detailHref} className="block" tabIndex={-1} aria-hidden="true">
        <div className="relative aspect-[1.48] overflow-hidden bg-primary">
          <img
            src={thumbnailUrl ?? FALLBACK_THUMBNAIL}
            alt=""
            className="size-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5">
            {categoryName && (
              <span className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-black uppercase leading-none text-primary shadow-sm">
                {categoryName}
              </span>
            )}
            {level && (
              <span className="rounded-md border border-white/25 bg-primary/60 px-2.5 py-1 text-[10px] font-black uppercase leading-none text-primary-foreground backdrop-blur">
                {level}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={detailHref} className="group/title">
          <h3 className="line-clamp-2 text-xl font-black leading-tight text-primary transition group-hover/title:text-secondary">{course.title}</h3>
        </Link>
        {course.short_description && (
          <p className="mt-1.5 line-clamp-2 text-sm font-medium text-muted-foreground">{course.short_description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
          {course.duration && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              {course.duration}
            </span>
          )}
          {course.enrollment_count > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 shrink-0" />
              {course.enrollment_count} enrolled
            </span>
          )}
          {course.review_count > 0 && course.avg_rating != null && (
            <span className="flex items-center gap-1 font-black text-amber-500">
              <Star className="size-3.5 shrink-0 fill-current" />
              {course.avg_rating.toFixed(1)}
              <span className="font-semibold text-muted-foreground">({course.review_count})</span>
            </span>
          )}
        </div>

        <div className="mt-4 rounded-[16px] bg-muted p-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-black tracking-tight text-primary">
                {formatPrice(hasDiscount ? course.discount_price : course.price)}
              </p>
              {hasDiscount && (
                <p className="mt-1 text-sm font-semibold text-muted-foreground line-through">{formatPrice(course.price)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">Mentor</p>
              <h4 className="line-clamp-1 break-words text-sm font-black leading-5 text-primary">{course.mentor_name ?? "SkillGuru Mentor"}</h4>
            </div>
            <Link
              to={detailHref}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-black text-primary shadow-sm transition duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-primary"
            >
              View Course
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
