import { useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Grid2X2, Quote, TrendingUp, Users } from "lucide-react";

import { CTAButton } from "@/components/common/CTAButton";
import { CTABanner } from "@/components/site/CTABanner";
import { categories, successStories } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";
import { routes } from "@/lib/routes";

const storyFilters = ["All Stories", "Data Science", "Web Development", "UI/UX Design", "Cloud Computing", "Digital Marketing", "Cyber Security"];

export default function SuccessStoriesPage() {
  usePageMeta("Success Stories");
  const [filter, setFilter] = useState("All Stories");

  return (
    <main className="page-shell">
      <section className="relative overflow-hidden bg-[#111E79] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(25,217,255,0.18),transparent_27rem)]" />
        <div className="relative mx-auto max-w-[1280px]">
          <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-6xl">Real Stories. <span className="block">Real <span className="text-[#19C7C8]">Transformations.</span></span></h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/76">
            From learning new skills to landing dream jobs, our students have made it happen. You can be next.
          </p>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "10,000+", label: "Students Transformed", icon: Users },
              { value: "800+", label: "Hiring Partners", icon: BriefcaseBusiness },
              { value: "95%", label: "Placement Rate", icon: TrendingUp },
              { value: "8.5 LPA", label: "Average Package Offered", icon: CheckCircle2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="flex items-center gap-4 rounded-[20px] border border-white/15 bg-white/8 p-5">
                  <span className="grid size-14 place-items-center rounded-[14px] bg-[#19C7C8]/15 text-[#19C7C8]">
                    <Icon className="size-6" />
                  </span>
                  <span>
                    <span className="block text-2xl font-black">{item.value}</span>
                    <span className="text-sm text-white/72">{item.label}</span>
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="-mt-8 px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-[1280px] rounded-[20px] border border-[#E5EAF5] bg-white p-4 shadow-[0_22px_80px_rgba(10,42,136,0.14)]">
          <div className="hide-scrollbar flex gap-3 overflow-x-auto">
            {storyFilters.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={filter === item ? "inline-flex min-w-max items-center gap-2 rounded-[12px] bg-[#5B35F2] px-4 py-3 text-sm font-black text-white" : "inline-flex min-w-max items-center gap-2 rounded-[12px] border border-[#E5EAF5] bg-white px-4 py-3 text-sm font-black text-[#111E79]"}
              >
                {index === 0 ? <Grid2X2 className="size-4" /> : null}
                {item}
              </button>
            ))}
            <select className="ml-auto h-11 min-w-36 rounded-[12px] border border-[#E5EAF5] px-3 text-sm font-black text-[#111E79]">
              <option>Sort By: Latest</option>
              <option>Package</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFF] px-4 py-12 sm:px-6 lg:px-8 lg:py-[80px]">
        <div className="mx-auto grid max-w-[1280px] gap-6 md:grid-cols-2 lg:grid-cols-4">
          {successStories.map((story) => (
            <article key={story.name} className="overflow-hidden rounded-[20px] border border-[#E5EAF5] bg-white shadow-[0_18px_55px_rgba(10,42,136,0.08)] transition hover:-translate-y-1">
              <div className="relative h-36 bg-[#111E79]">
                <img src={story.avatar} alt="" className="h-full w-full object-cover object-top opacity-90" />
                <div className="absolute right-4 top-4 rounded-[10px] bg-white p-3 text-center shadow-lg">
                  <p className="text-[10px] font-bold text-[#64748B]">Placed at</p>
                  <img src={story.companyLogo} alt={story.company} className="mt-1 h-8 w-24 object-contain" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-black text-[#111E79]">{story.name}</h3>
                <p className="mt-1 text-sm font-semibold text-[#5B35F2]">{story.role}</p>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] gap-2 text-xs font-semibold text-[#64748B]">
                  <span>Before<strong className="block text-[#111E79]">{story.before}</strong></span>
                  <span className="pt-3 text-[#5B35F2]">→</span>
                  <span>After<strong className="block text-[#111E79]">{story.after}</strong></span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-xs font-semibold text-[#64748B]">
                  <span>Package<strong className="block text-lg text-[#22C55E]">{story.package}</strong></span>
                  <span>Course<strong className="block text-[#111E79]">{story.course}</strong></span>
                  <span>Duration<strong className="block text-[#111E79]">{story.duration}</strong></span>
                </div>
                <p className="mt-5 min-h-20 text-sm leading-6 text-[#475569]">{story.quote}</p>
                <Quote className="ml-auto size-7 text-[#5B35F2]" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-4 pb-12 sm:px-6 lg:px-8">
        <div className="brand-gradient mx-auto grid max-w-[1280px] gap-8 rounded-[20px] p-7 text-white shadow-[0_24px_80px_rgba(10,42,136,0.2)] lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">Your Success Story <span className="block text-[#19C7C8]">Could Be Next!</span></h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/74">Join thousands of learners who transformed their careers with SkillGuru.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {categories.slice(1, 5).map((item) => (
              <div key={item} className="rounded-[16px] border border-white/15 bg-white/8 p-4 text-center text-sm font-bold">
                {item}
              </div>
            ))}
          </div>
          <CTAButton to={routes.freeCounselling} className="bg-[#19C7C8] text-[#111E79] hover:bg-white lg:col-start-2 lg:ml-auto">
            Book Free Counselling
          </CTAButton>
        </div>
      </section>

      <CTABanner title="Start your own transformation" description="Book a free counselling session and choose the right learning path for your career goal." />
    </main>
  );
}
