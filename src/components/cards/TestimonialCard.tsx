import { Quote } from "lucide-react";

import type { Testimonial } from "@/types/platform";

export function TestimonialCard({ testimonial }: Readonly<{ testimonial: Testimonial }>) {
  return (
    <article className="premium-surface h-full rounded-[20px] border border-[#E5EAF5] bg-white p-6 shadow-[0_18px_60px_rgba(10,42,136,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#19C7C8]/45 hover:shadow-[0_24px_72px_rgba(17,71,255,0.14)]">
      <div className="flex items-center gap-4">
        <img src={testimonial.avatar} alt="" className="size-14 rounded-full object-cover" loading="lazy" />
        <div>
          <h3 className="font-black text-[#111E79]">{testimonial.name}</h3>
          <p className="text-xs font-semibold text-[#64748B]">{testimonial.role}</p>
        </div>
        <img src={testimonial.companyLogo} alt={testimonial.company} className="ml-auto h-8 max-w-24 object-contain" loading="lazy" />
      </div>
      <Quote className="mt-6 size-8 text-[#5B35F2]" />
      <p className="mt-4 min-h-24 text-sm leading-7 text-[#475569]">{testimonial.quote}</p>
      <div className="mt-6 border-t border-[#E5EAF5] pt-5">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#22C55E]">{testimonial.growth}</span>
      </div>
    </article>
  );
}
