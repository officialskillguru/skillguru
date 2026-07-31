import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, Star, Users } from "lucide-react";

import { MentorCard } from "@/components/cards/MentorCard";
import { CTAButton } from "@/components/common/CTAButton";
import { CTABanner } from "@/components/site/CTABanner";
import { mentorRepository } from "@/features/mentor-profile/services/mentor.repository";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useJsonLd } from "@/hooks/useJsonLd";
import { routes, mentorProfileRoute } from "@/lib/routes";
import { siteConfig } from "@/config/site";
import { getNextTabIndex } from "@/lib/a11y-tabs";

type SortKey = "popular" | "rating" | "experience";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Sort By: Most Students" },
  { value: "rating", label: "Sort By: Highest Rated" },
  { value: "experience", label: "Sort By: Most Experienced" },
];

export default function MentorsPage() {
  usePageMeta("Mentors", undefined, routes.mentors);
  const [activeTab, setActiveTab] = useState("All Mentors");
  const [sortKey, setSortKey] = useState<SortKey>("popular");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { data: mentors, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-mentor-catalog"],
    queryFn: () => mentorRepository.listCatalog(),
  });

  const allMentors = useMemo(() => mentors ?? [], [mentors]);

  useJsonLd(
    allMentors.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: allMentors.map((mentor, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${siteConfig.url}${mentorProfileRoute(mentor.slug)}`,
            name: mentor.name,
          })),
        }
      : null
  );

  const tabs = useMemo(() => {
    const categories = Array.from(new Set(allMentors.map((m) => m.category).filter(Boolean)));
    return ["All Mentors", ...categories];
  }, [allMentors]);

  const sortedMentors = useMemo(() => {
    const filtered = activeTab === "All Mentors" ? allMentors : allMentors.filter((m) => m.category === activeTab);
    const sorted = [...filtered];
    if (sortKey === "rating") sorted.sort((a, b) => b.rating - a.rating);
    else if (sortKey === "experience") sorted.sort((a, b) => b.experienceYears - a.experienceYears);
    else sorted.sort((a, b) => b.studentsMentored - a.studentsMentored);
    return sorted;
  }, [allMentors, activeTab, sortKey]);

  const totalStudents = allMentors.reduce((sum, m) => sum + m.studentsMentored, 0);
  const totalExperience = allMentors.reduce((sum, m) => sum + m.experienceYears, 0);
  const featured = sortedMentors[0];

  const mentorStats = [
    { value: `${allMentors.length}+`, label: "Expert Mentors", icon: Users },
    { value: `${totalExperience}+`, label: "Years of Combined Industry Experience", icon: CalendarCheck2 },
    { value: `${totalStudents}+`, label: "Students Mentored", icon: Star },
  ];

  return (
    <main className="page-shell">
      <section className="relative bg-primary px-4 py-14 text-primary-foreground sm:px-6 lg:px-8 lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(25,217,255,0.20),transparent_28rem)]" />
        <div className="relative mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-accent">Our Mentors</p>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">Learn From Industry Experts. <span className="block text-accent">Accelerate Your Career.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-primary-foreground/74">
              Our mentors are experienced professionals from top companies who are passionate about guiding you to success.
            </p>
            <div className="mt-8">
              <CTAButton to={routes.freeCounselling} className="bg-accent text-primary hover:bg-primary-foreground hover:text-primary">Book Free Session</CTAButton>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {mentorStats.map((item) => {
              const Icon = item.icon;
              return (
              <article key={item.label} className="rounded-[20px] border border-white/15 bg-white/5 p-6 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-[14px] bg-accent/15 text-accent">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-6 text-3xl font-black">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-primary-foreground/72">{item.label}</p>
              </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="-mt-8 px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-[1280px] rounded-[20px] border border-border bg-card p-4 shadow-[0_22px_80px_rgba(10,42,136,0.14)]">
          <div role="tablist" aria-label="Filter mentors by expertise" className="hide-scrollbar flex gap-3 overflow-x-auto">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                ref={(el) => { tabRefs.current[tab] = el; }}
                type="button"
                role="tab"
                id={`mentors-filter-tab-${tab}`}
                aria-controls="mentors-results-panel"
                aria-selected={activeTab === tab}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => {
                  const nextIndex = getNextTabIndex(i, e.key, tabs.length);
                  const nextTab = nextIndex === null ? undefined : tabs[nextIndex];
                  if (!nextTab) return;
                  e.preventDefault();
                  setActiveTab(nextTab);
                  tabRefs.current[nextTab]?.focus();
                }}
                className={activeTab === tab ? "min-w-max rounded-[12px] bg-secondary px-4 py-3 text-sm font-black text-primary-foreground" : "min-w-max rounded-[12px] border border-border bg-card px-4 py-3 text-sm font-black text-primary"}
              >
                {tab}
              </button>
            ))}
            <label htmlFor="mentor-sort" className="sr-only">Sort mentors</label>
            <select
              id="mentor-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="ml-auto h-11 min-w-36 rounded-[12px] border border-border px-3 text-sm font-black text-primary"
            >
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-[80px]">
        <div id="mentors-results-panel" role="tabpanel" aria-labelledby={`mentors-filter-tab-${activeTab}`} className="mx-auto max-w-[1280px]">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading mentors">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-xl bg-card" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-12 text-center">
              <p className="font-semibold text-red-700">Failed to load mentors. Please try again.</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-black uppercase tracking-wider text-red-700 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          ) : sortedMentors.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
              No mentors found in this category yet.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {sortedMentors.map((mentor) => <MentorCard key={mentor.slug} mentor={mentor} />)}
            </div>
          )}
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1280px] gap-5 rounded-[20px] border border-border bg-muted p-7 md:grid-cols-5">
          <h2 className="text-2xl font-black text-primary">Why Learn From <span className="block text-secondary">Our Mentors?</span></h2>
          {[
            ["Industry Expertise", "Learn from experts working in top companies"],
            ["Real-world Insights", "Get practical knowledge and industry best practices"],
            ["1:1 Guidance", "Personalized mentorship for your growth"],
            ["Career Acceleration", "Mentorship that helps you achieve more"],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="text-sm font-black text-primary">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {featured && (
        <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-[80px]">
          <div className="mx-auto grid max-w-[1280px] gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-[20px] border border-border bg-card p-5 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
              {featured.avatar ? (
                <img src={featured.avatar} alt={featured.name} className="h-52 w-full rounded-[16px] object-cover object-top" />
              ) : (
                <div className="grid h-52 w-full place-items-center rounded-[16px] bg-primary/10 text-4xl font-black text-primary">
                  {featured.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
              )}
              <h2 className="mt-5 text-2xl font-black text-primary">{featured.name}</h2>
              <p className="mt-1 text-sm font-semibold text-secondary">{featured.role}</p>
              {featured.company && <p className="text-sm text-muted-foreground">{featured.company}</p>}
              <div className="mt-5 grid grid-cols-3 gap-3 text-xs font-bold text-muted-foreground">
                <span><strong className="block text-primary">{featured.experienceYears}+</strong>Years</span>
                <span><strong className="block text-primary">{featured.studentsMentored}+</strong>Students</span>
                <span><strong className="block text-primary">{featured.rating > 0 ? featured.rating.toFixed(1) : "—"}</strong>Rating</span>
              </div>
              <CTAButton to={routes.freeCounselling} className="mt-6 w-full">Book 1:1 Session</CTAButton>
            </aside>
            <article className="rounded-[20px] border border-border bg-card p-7 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
              <h3 className="text-lg font-black text-primary">Featured Mentor: {featured.name}</h3>
              {featured.bio && <p className="mt-3 text-sm leading-7 text-muted-foreground">{featured.bio}</p>}
              {featured.expertise.length > 0 && (
                <>
                  <h3 className="mt-7 text-lg font-black text-primary">Top Expertise</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {featured.expertise.map((item) => (
                      <span key={item} className="rounded-md bg-secondary/10 px-3 py-2 text-xs font-black text-secondary">{item}</span>
                    ))}
                  </div>
                </>
              )}
              {featured.workedWith.length > 0 && (
                <>
                  <h3 className="mt-7 text-lg font-black text-primary">Companies Worked With</h3>
                  <div className="mt-4 flex flex-wrap gap-5 text-xl font-black text-primary">
                    {featured.workedWith.map((company) => <span key={company}>{company}</span>)}
                  </div>
                </>
              )}
            </article>
          </div>
        </section>
      )}

      <CTABanner title="Not sure which mentor is right for you?" description="Book a free session and let us help you find the perfect mentor." />
    </main>
  );
}
