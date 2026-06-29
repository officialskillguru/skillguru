import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Heart, Star } from "lucide-react";

import type { Course } from "@/types/platform";
import { courseDetailRoute } from "@/lib/routes";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" }).format(value);
}

export function CourseCard({ course }: Readonly<{ course: Course }>) {
  return (
    <article className="premium-surface group flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#E5EAF5] bg-white shadow-[0_18px_55px_rgba(10,42,136,0.08)] transition duration-300 hover:-translate-y-1.5 hover:border-[#19C7C8]/45 hover:shadow-[0_24px_75px_rgba(17,71,255,0.16)]">
      <Link to={courseDetailRoute(course.slug)} className="block">
        <div className="relative aspect-[1.48] overflow-hidden bg-[#111E79]">
          <img src={course.image} alt={course.title} className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.25rem)] flex-wrap gap-1.5">
            <span className="rounded-md bg-[#19C7C8] px-2.5 py-1 text-[10px] font-black uppercase leading-none text-[#111E79] shadow-[0_10px_24px_rgba(25,217,255,0.24)]">
              {course.badge}
            </span>
            <span className="rounded-md border border-white/25 bg-[#111E79]/60 px-2.5 py-1 text-[10px] font-black uppercase leading-none text-white backdrop-blur">
              {course.track}
            </span>
          </div>
          <button type="button" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-white/40 bg-[#111E79]/40 text-white backdrop-blur transition hover:bg-white hover:text-[#5B35F2]" aria-label={`Wishlist ${course.title}`}>
            <Heart className="size-4" />
          </button>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={courseDetailRoute(course.slug)} className="group/title">
          <h3 className="line-clamp-2 text-xl font-black leading-tight text-[#111E79] transition group-hover/title:text-[#5B35F2]">{course.title}</h3>
        </Link>
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[#64748B]">
          <CalendarDays className="size-4 shrink-0" />
          {course.duration} Program
        </p>

        <div className="mt-5 rounded-[16px] bg-[#F8FAFF] p-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-black tracking-tight text-[#111E79]">{formatPrice(course.price)}</p>
              <p className="mt-1 text-sm font-semibold text-[#94A3B8] line-through">{formatPrice(course.oldPrice)}</p>
            </div>
            <span className="mb-1 shrink-0 rounded-full bg-[#EAFBF1] px-2.5 py-1 text-xs font-black text-[#16A34A]">
              {course.discount}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2 border-t border-[#E5EAF5] pt-4">
            <img src={course.mentorAvatar} alt={`${course.mentor} mentor`} className="size-10 shrink-0 rounded-full object-cover ring-4 ring-[#F1F5FF]" loading="lazy" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#94A3B8]">Mentor</p>
              <h4 className="line-clamp-2 break-words text-sm font-black leading-5 text-[#111E79]">{course.mentor}</h4>
              <div className="mt-1 flex items-center gap-1 text-xs font-black text-amber-500">
                <Star className="size-3.5 shrink-0 fill-current" />
                <span>{course.rating}</span>
              </div>
            </div>
            <Link to={courseDetailRoute(course.slug)} className="grid size-10 shrink-0 place-items-center rounded-full border border-[#E5EAF5] bg-white text-[#111E79] shadow-[0_10px_28px_rgba(10,42,136,0.08)] transition duration-300 group-hover:translate-x-1 group-hover:border-[#19C7C8] group-hover:bg-[#19C7C8] group-hover:text-[#111E79]" aria-label={`View ${course.title}`}>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
