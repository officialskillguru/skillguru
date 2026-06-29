import { ArrowRight, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";

import type { Mentor } from "@/types/platform";

export function MentorCard({ mentor }: Readonly<{ mentor: Mentor }>) {
  return (
    <article className="premium-surface group overflow-hidden rounded-[20px] border border-[#E5EAF5] bg-white shadow-[0_18px_55px_rgba(10,42,136,0.08)] transition duration-300 hover:-translate-y-1.5 hover:border-[#19C7C8]/45 hover:shadow-[0_24px_75px_rgba(17,71,255,0.14)]">
      <div className="relative h-36 bg-gradient-to-br from-[#111E79] to-[#111E79]">
        <img src={mentor.avatar} alt="" className="absolute bottom-0 left-5 h-32 w-28 object-cover object-top transition duration-500 group-hover:scale-105" loading="lazy" />
        <div className="absolute right-4 top-4 rounded-[10px] bg-white p-3 shadow-[0_12px_30px_rgba(10,42,136,0.16)]">
          <img src={mentor.companyLogo} alt={mentor.company} className="h-7 w-20 object-contain" loading="lazy" />
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-black text-[#111E79]">{mentor.name}</h3>
        <p className="mt-1 text-sm font-semibold text-[#5B35F2]">{mentor.role}</p>
        <p className="mt-1 text-sm text-[#64748B]">{mentor.company}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
          <span className="font-bold text-[#64748B]">
            <strong className="block text-[#111E79]">{mentor.experience}</strong>
            Years Exp.
          </span>
          <span className="font-bold text-[#64748B]">
            <strong className="flex items-center gap-1 text-[#111E79]"><Users className="size-3.5" /> {mentor.studentsMentored}+</strong>
            Students
          </span>
          <span className="font-bold text-[#64748B]">
            <strong className="flex items-center gap-1 text-[#111E79]"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {mentor.rating}</strong>
            Rating
          </span>
        </div>
        <p className="mt-5 text-xs font-black uppercase text-[#111E79]">Expertise</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {mentor.expertise.map((item) => (
            <span key={item} className="rounded-md bg-[#F1F5FF] px-2.5 py-1 text-[11px] font-bold text-[#5B35F2]">
              {item}
            </span>
          ))}
        </div>
        <Link to={`/mentors/${mentor.slug}`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#E5EAF5] px-4 py-3 text-sm font-black text-[#5B35F2] transition group-hover:border-[#5B35F2] group-hover:bg-[#F8FAFF] group-hover:shadow-[0_12px_28px_rgba(17,71,255,0.12)]">
          View Profile <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
