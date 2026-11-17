import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Clock, Star, Users } from "lucide-react";

import type { PublicCourseRow } from "@/services/courses.service";
import { resolveFileUrl } from "@/services/storage.service";
import { courseDetailRoute } from "@/lib/routes";
import { courseAccent } from "@/lib/courseVisuals";

/**
 * Local, always-available artwork used when a course has no thumbnail or the
 * signed URL cannot be resolved/loaded. Never depends on an external host.
 */
function CourseArtworkFallback({ label, categorySlug }: Readonly<{ label: string; categorySlug: string | null }>) {
  const accent = courseAccent(categorySlug);
  return (
    <div
      className="flex size-full items-end p-4"
      style={{ background: `radial-gradient(circle at 85% 15%, ${accent}66 0, transparent 50%), linear-gradient(135deg, #0B1736 0%, #0F2557 60%, #132F6B 100%)` }}
    >
      <p className="text-sm font-black uppercase tracking-[0.14em] text-white/80">{label}</p>
    </div>
  );
}

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

  const [imageFailed, setImageFailed] = useState(false);
  const category = course.course_categories.find((cc) => cc.categories)?.categories ?? null;
  const categoryName = category?.name ?? null;
  const level = levelLabel(course.level);
  const hasDiscount = course.discount_price != null && course.price != null && course.discount_price < course.price;
  const detailHref = courseDetailRoute(course.slug);

  return (
    <article className="premium-surface group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-accent/45 hover:shadow-md">
      <Link to={detailHref} className="block" tabIndex={-1} aria-hidden="true">
        <div className="relative aspect-[1.48] overflow-hidden bg-primary">
          {thumbnailUrl && !imageFailed ? (
            <img
              src={thumbnailUrl}
              alt=""
              className="size-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <CourseArtworkFallback label={categoryName ?? "SkillGuru"} categorySlug={category?.slug ?? null} />
          )}
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
          {course.is_demo && (
            <span
              className="absolute right-3 top-3 rounded-md border border-dashed border-white/60 bg-primary/70 px-2 py-1 text-[10px] font-black uppercase leading-none text-white backdrop-blur"
              title="Demonstration course created for platform review"
            >
              Demo
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={detailHref} className="group/title">
          <h3 className="line-clamp-2 text-xl font-black leading-tight text-primary transition group-hover/title:text-secondary">{course.title}</h3>
        </Link>
        {course.short_description && (
          <p className="mt-1.5 line-clamp-2 text-sm font-medium text-muted-foreground">{course.short_description}</p>
        )}
        {course.skills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills covered">
            {course.skills.slice(0, 3).map((skill) => (
              <li key={skill.slug} className="rounded-md bg-secondary/10 px-2 py-0.5 text-[11px] font-bold text-secondary">
                {skill.name}
              </li>
            ))}
          </ul>
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
