import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Heart, Star } from "lucide-react";

import type { Course } from "@/types/platform";
import { courseDetailRoute } from "@/lib/routes";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" }).format(value);
}

export function CourseCard({ course }: Readonly<{ course: Course }>) {
  return (
    <article className="premium-surface group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-accent/45 hover:shadow-md">
      <Link to={courseDetailRoute(course.slug)} className="block">
        <div className="relative aspect-[1.48] overflow-hidden bg-primary">
          <img src={course.image} alt={course.title} className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.25rem)] flex-wrap gap-1.5">
            <span className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-black uppercase leading-none text-primary shadow-sm">
              {course.badge}
            </span>
            <span className="rounded-md border border-white/25 bg-primary/60 px-2.5 py-1 text-[10px] font-black uppercase leading-none text-primary-foreground backdrop-blur">
              {course.track}
            </span>
          </div>
          <button type="button" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-white/40 bg-primary/40 text-primary-foreground backdrop-blur transition hover:bg-background hover:text-secondary" aria-label={`Wishlist ${course.title}`}>
            <Heart className="size-4" />
          </button>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={courseDetailRoute(course.slug)} className="group/title">
          <h3 className="line-clamp-2 text-xl font-black leading-tight text-primary transition group-hover/title:text-secondary">{course.title}</h3>
        </Link>
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          {course.duration} Program
        </p>

        <div className="mt-5 rounded-[16px] bg-muted p-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-black tracking-tight text-primary">{formatPrice(course.price)}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground line-through">{formatPrice(course.oldPrice)}</p>
            </div>
            <span className="mb-1 shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-600">
              {course.discount}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <img src={course.mentorAvatar} alt={`${course.mentor} mentor`} className="size-10 shrink-0 rounded-full object-cover ring-4 ring-muted" loading="lazy" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">Mentor</p>
              <h4 className="line-clamp-2 break-words text-sm font-black leading-5 text-primary">{course.mentor}</h4>
              <div className="mt-1 flex items-center gap-1 text-xs font-black text-amber-500">
                <Star className="size-3.5 shrink-0 fill-current" />
                <span>{course.rating}</span>
              </div>
            </div>
            <Link to={courseDetailRoute(course.slug)} className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-primary shadow-sm transition duration-300 group-hover:translate-x-1 group-hover:border-accent group-hover:bg-accent group-hover:text-primary" aria-label={`View ${course.title}`}>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
