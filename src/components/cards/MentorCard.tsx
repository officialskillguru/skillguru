import { ArrowRight, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";

import type { Mentor } from "@/types/platform";

export function MentorCard({ mentor }: Readonly<{ mentor: Mentor }>) {
  return (
    <article className="premium-surface group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-accent/45 hover:shadow-md">
      <div className="relative h-36 bg-gradient-to-br from-primary to-primary">
        <img src={mentor.avatar} alt="" className="absolute bottom-0 left-5 h-32 w-28 object-cover object-top transition duration-500 group-hover:scale-105" loading="lazy" />
        <div className="absolute right-4 top-4 rounded-lg bg-card p-3 shadow-sm">
          <img src={mentor.companyLogo} alt={mentor.company} className="h-7 w-20 object-contain" loading="lazy" />
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-black text-primary">{mentor.name}</h3>
        <p className="mt-1 text-sm font-semibold text-secondary">{mentor.role}</p>
        <p className="mt-1 text-sm text-muted-foreground">{mentor.company}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
          <span className="font-bold text-muted-foreground">
            <strong className="block text-primary">{mentor.experience}</strong>
            Years Exp.
          </span>
          <span className="font-bold text-muted-foreground">
            <strong className="flex items-center gap-1 text-primary"><Users className="size-3.5" /> {mentor.studentsMentored}+</strong>
            Students
          </span>
          <span className="font-bold text-muted-foreground">
            <strong className="flex items-center gap-1 text-primary"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {mentor.rating}</strong>
            Rating
          </span>
        </div>
        <p className="mt-5 text-xs font-black uppercase text-primary">Expertise</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {mentor.expertise.map((item) => (
            <span key={item} className="rounded-md bg-secondary/10 px-2.5 py-1 text-[11px] font-bold text-secondary">
              {item}
            </span>
          ))}
        </div>
        <Link to={`/mentors/${mentor.slug}`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-black text-secondary transition group-hover:border-secondary group-hover:bg-muted group-hover:shadow-sm">
          View Profile <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
