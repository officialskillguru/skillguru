import { useState } from "react";
import { ArrowRight, Building2, CalendarCheck2, Star, Users } from "lucide-react";

import { MentorCard } from "@/components/cards/MentorCard";
import { CTAButton } from "@/components/common/CTAButton";
import { CTABanner } from "@/components/site/CTABanner";
import { mentors } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";
import { routes } from "@/lib/routes";
const tabs = ["All Mentors", "Data Science", "Web Development", "UI/UX Design", "Cloud Computing", "Digital Marketing", "Cyber Security"];
const mentorStats = [
  { value: "50+", label: "Expert Mentors", icon: Users },
  { value: "100+", label: "Years of Combined Industry Experience", icon: CalendarCheck2 },
  { value: "10,000+", label: "Students Mentored", icon: Star },
  { value: "500+", label: "Top Companies Represented", icon: Building2 },
];

export default function MentorsPage() {
  usePageMeta("Mentors");
  const [activeTab, setActiveTab] = useState("All Mentors");
  const featured = mentors[0]!;
  const visibleMentors = activeTab === "All Mentors" ? mentors : mentors.filter((mentor) => mentor.category === activeTab);

  return (
    <main className="page-shell">
      <section className="relative bg-[#111E79] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(25,217,255,0.20),transparent_28rem)]" />
        <div className="relative mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#19C7C8]">Our Mentors</p>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">Learn From Industry Experts. <span className="block text-[#19C7C8]">Accelerate Your Career.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/74">
              Our mentors are experienced professionals from top companies who are passionate about guiding you to success.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CTAButton to={routes.freeCounselling} className="bg-[#19C7C8] text-[#111E79] hover:bg-white">Book Free Session</CTAButton>
              <button type="button" className="inline-flex min-h-12 items-center gap-3 rounded-[14px] border border-white/20 px-5 text-sm font-black text-white">
                How Mentorship Works <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {mentorStats.map((item) => {
              const Icon = item.icon;
              return (
              <article key={item.label} className="rounded-[20px] border border-white/15 bg-white/8 p-6 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-[14px] bg-[#19C7C8]/15 text-[#19C7C8]">
                  <Icon className="size-6" />
                </span>
                <p className="mt-6 text-3xl font-black">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-white/72">{item.label}</p>
              </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="-mt-8 px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-[1280px] rounded-[20px] border border-[#E5EAF5] bg-white p-4 shadow-[0_22px_80px_rgba(10,42,136,0.14)]">
          <div className="hide-scrollbar flex gap-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? "min-w-max rounded-[12px] bg-[#5B35F2] px-4 py-3 text-sm font-black text-white" : "min-w-max rounded-[12px] border border-[#E5EAF5] bg-white px-4 py-3 text-sm font-black text-[#111E79]"}
              >
                {tab}
              </button>
            ))}
            <select className="ml-auto h-11 min-w-36 rounded-[12px] border border-[#E5EAF5] px-3 text-sm font-black text-[#111E79]">
              <option>Sort By: Popular</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFF] px-4 py-12 sm:px-6 lg:px-8 lg:py-[80px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {(visibleMentors.length ? visibleMentors : mentors).map((mentor) => <MentorCard key={mentor.name} mentor={mentor} />)}
          </div>
          <div className="mt-8 flex justify-center">
            <button type="button" className="rounded-[14px] border border-[#5B35F2] px-8 py-3 text-sm font-black text-[#5B35F2] transition hover:-translate-y-1 hover:bg-white">
              View All Mentors
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1280px] gap-5 rounded-[20px] border border-[#E5EAF5] bg-[#F8FAFF] p-7 md:grid-cols-5">
          <h2 className="text-2xl font-black text-[#111E79]">Why Learn From <span className="block text-[#5B35F2]">Our Mentors?</span></h2>
          {[
            ["Industry Expertise", "Learn from experts working in top companies"],
            ["Real-world Insights", "Get practical knowledge and industry best practices"],
            ["1:1 Guidance", "Personalized mentorship for your growth"],
            ["Career Acceleration", "Mentorship that helps you achieve more"],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="text-sm font-black text-[#111E79]">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F8FAFF] px-4 py-12 sm:px-6 lg:px-8 lg:py-[80px]">
        <div className="mx-auto grid max-w-[1280px] gap-6 lg:grid-cols-[280px_1fr_300px]">
          <aside className="rounded-[20px] border border-[#E5EAF5] bg-white p-5 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
            <img src={featured.avatar} alt="" className="h-52 w-full rounded-[16px] object-cover object-top" />
            <h2 className="mt-5 text-2xl font-black text-[#111E79]">{featured.name}</h2>
            <p className="mt-1 text-sm font-semibold text-[#5B35F2]">{featured.role}</p>
            <p className="text-sm text-[#64748B]">{featured.company}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-xs font-bold text-[#64748B]">
              <span><strong className="block text-[#111E79]">{featured.experienceYears}+</strong>Years</span>
              <span><strong className="block text-[#111E79]">{featured.studentsMentored}+</strong>Students</span>
              <span><strong className="block text-[#111E79]">{featured.rating}</strong>Rating</span>
            </div>
            <CTAButton to={routes.freeCounselling} className="mt-6 w-full">Book 1:1 Session</CTAButton>
          </aside>
          <article className="rounded-[20px] border border-[#E5EAF5] bg-white p-7 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
            <div className="hide-scrollbar flex gap-8 overflow-x-auto border-b border-[#E5EAF5] pb-4 text-sm font-black text-[#64748B]">
              {["About", "Expertise", "Experience", "Mentorship", "Reviews"].map((tab, index) => (
                <span key={tab} className={index === 0 ? "text-[#5B35F2]" : undefined}>{tab}</span>
              ))}
            </div>
            <h3 className="mt-6 text-lg font-black text-[#111E79]">About Mentor</h3>
            <p className="mt-3 text-sm leading-7 text-[#64748B]">{featured.bio}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                ["Experience", featured.experience],
                ["Location", featured.location],
                ["Language", featured.language],
                ["Availability", featured.availability],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-[#E5EAF5] bg-[#F8FAFF] p-4">
                  <p className="text-xs font-semibold text-[#64748B]">{label}</p>
                  <p className="mt-1 text-xs font-black text-[#111E79]">{value}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-7 text-lg font-black text-[#111E79]">Top Expertise</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {featured.expertise.map((item) => (
                <span key={item} className="rounded-md bg-[#F1F5FF] px-3 py-2 text-xs font-black text-[#5B35F2]">{item}</span>
              ))}
            </div>
            <h3 className="mt-7 text-lg font-black text-[#111E79]">Companies Worked With</h3>
            <div className="mt-4 flex flex-wrap gap-5 text-xl font-black text-[#111E79]">
              {featured.workedWith.map((company) => <span key={company}>{company}</span>)}
            </div>
          </article>
          <aside className="rounded-[20px] border border-[#E5EAF5] bg-white p-6 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
            <h2 className="text-lg font-black text-[#111E79]">What You&apos;ll Get</h2>
            <div className="mt-5 space-y-3">
              {["1:1 Live Mentorship", "Personalized Career Guidance", "Resume & Interview Support", "Project Reviews", "Industry Insights"].map((item) => (
                <p key={item} className="flex gap-2 text-sm font-semibold text-[#334155]">
                  <CheckIcon />
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-8 border-t border-[#E5EAF5] pt-6">
              <p className="text-lg font-black text-[#111E79]">Student Reviews</p>
              <p className="mt-4 flex items-center gap-2 text-2xl font-black text-[#111E79]">
                {featured.rating}
                <span className="flex text-amber-400">{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4 fill-current" />)}</span>
              </p>
              <p className="mt-4 rounded-[14px] bg-[#F8FAFF] p-4 text-sm leading-6 text-[#64748B]">
                Rahul sir&apos;s guidance helped me clear interviews at top product companies. Highly recommend!
              </p>
            </div>
          </aside>
        </div>
      </section>

      <CTABanner title="Not sure which mentor is right for you?" description="Book a free session and let us help you find the perfect mentor." />
    </main>
  );
}

function CheckIcon() {
  return <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#F1F5FF] text-xs font-black text-[#5B35F2]">✓</span>;
}
