import { useEffect, useRef, type ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  Cloud,
  Code,
  Compass,
  FileText,
  Globe,
  GraduationCap,
  Layers3,
  LineChart,
  Megaphone,
  MessagesSquare,
  PenTool,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { GsapReveal } from "@/components/motion/gsap-reveal";
import { MentorCard } from "@/components/cards/MentorCard";
import { PublicCourseCard } from "@/components/cards/PublicCourseCard";
import { CTABanner } from "@/components/site/CTABanner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { faqs } from "@/data/platform";
import { mentorRepository } from "@/features/mentor-profile/services/mentor.repository";
import { usePageMeta } from "@/hooks/usePageMeta";
import { assetUrl } from "@/lib/asset-url";
import { routes } from "@/lib/routes";
import { listPublishedCourses } from "@/services/courses.service";
import { getHomeOverview } from "@/services/home.service";

type IconType = ComponentType<{ className?: string }>;

const CATEGORY_ICONS: Record<string, IconType> = {
  Globe,
  BrainCircuit,
  Code,
  ShieldCheck,
  Cloud,
  PenTool,
  Megaphone,
  Rocket,
  LineChart,
  MessagesSquare,
};

const AUDIENCES = ["College students", "Fresh graduates", "Working professionals", "Career switchers"];

const HOW_IT_WORKS: { title: string; description: string; icon: IconType }[] = [
  { title: "Explore", description: "Browse courses by category, skill, level and price, and preview the full curriculum before you commit.", icon: Search },
  { title: "Enroll", description: "Create a free account and enroll in a course. Free courses unlock instantly.", icon: UserCheck },
  { title: "Learn", description: "Work through structured modules and lessons, take notes and track your progress from your dashboard.", icon: BookOpen },
  { title: "Get certified", description: "Complete the course to earn a certificate anyone can verify online.", icon: Award },
];

// Benefits map to features that actually exist in the product today.
const BENEFITS: { title: string; description: string; icon: IconType }[] = [
  { title: "Structured curricula", description: "Every course is organised into modules and lessons with clear outcomes and prerequisites.", icon: Layers3 },
  { title: "Mentor guidance", description: "Courses are led by mentors who answer questions and run live classes for enrolled learners.", icon: Users },
  { title: "Verifiable certificates", description: "Certificates carry a unique code that employers can check on our verification page.", icon: ShieldCheck },
  { title: "Career tools", description: "Resume builder, career guidance and placement support live inside the student dashboard.", icon: FileText },
];

const PLATFORM_FAQS = [
  {
    question: "Are the courses in the catalogue real?",
    answer:
      "The catalogue currently includes demonstration courses, clearly marked with a “Demo” badge, so reviewers can explore the full learning experience. Demo courses, instructors and lesson text are illustrative and are not live commercial offerings.",
  },
  ...faqs,
];

function formatCount(value: number | undefined) {
  return value === undefined ? "—" : new Intl.NumberFormat("en-IN").format(value);
}

export default function HomePage() {
  usePageMeta("Career Transformation Platform");
  const location = useLocation();
  const faqRef = useRef<HTMLElement>(null);

  // /faq renders the homepage — bring the FAQ section into view.
  useEffect(() => {
    if (location.pathname === routes.faq) faqRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.pathname]);

  const overview = useQuery({ queryKey: ["home-overview"], queryFn: getHomeOverview, staleTime: 5 * 60 * 1000 });
  const featured = useQuery({
    queryKey: ["home-featured-courses"],
    // One course per category (newest first) so the rail represents the breadth of the catalogue.
    queryFn: async () => {
      const result = await listPublishedCourses({ pageSize: 100, sort: "newest" });
      const seen = new Set<string>();
      const picks = result.data.filter((course) => {
        const key = course.course_categories[0]?.categories?.slug ?? course.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...result, data: picks.slice(0, 8) };
    },
    staleTime: 5 * 60 * 1000,
  });
  const mentors = useQuery({ queryKey: ["public-mentor-catalog"], queryFn: () => mentorRepository.listCatalog(), staleTime: 5 * 60 * 1000 });

  const stats = overview.data?.stats;
  const topCategories = (overview.data?.categories ?? []).slice(0, 10);
  const statItems: { label: string; value: string; icon: IconType }[] = [
    { label: "Published courses", value: formatCount(stats?.publishedCourses), icon: GraduationCap },
    { label: "Course categories", value: formatCount(stats?.categoriesWithCourses), icon: Compass },
    { label: "Free courses", value: formatCount(stats?.freeCourses), icon: Sparkles },
    { label: "Mentors", value: formatCount(mentors.data?.length), icon: Users },
  ];

  return (
    <main className="page-shell overflow-x-clip">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-section relative isolate overflow-hidden bg-primary text-primary-foreground">
        <div className="hero-media">
          <video autoPlay muted loop playsInline preload="auto" poster={assetUrl("/assets/home/hero-career-roadmap-poster.jpg")} aria-hidden="true">
            <source src={assetUrl("/assets/home/hero-career-roadmap.mp4")} type="video/mp4" />
          </video>
          <span className="hero-media-vignette" aria-hidden="true" />
        </div>
        <div className="hero-video-glow" aria-hidden="true" />
        <div className="hero-left-overlay" aria-hidden="true" />
        <div className="hero-depth-overlay" aria-hidden="true" />

        <div className="hero-content relative z-[3] mx-auto flex h-full max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
          <div className="hero-copy relative z-10 w-full">
            <p className="hero-trust-badge inline-flex items-center gap-2.5 rounded-full border border-secondary/55 bg-secondary/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary-foreground backdrop-blur-sm">
              <GraduationCap className="size-3.5 text-accent" aria-hidden="true" />
              Career-focused online learning
            </p>
            <h1 className="hero-heading font-[900] text-primary-foreground [text-shadow:0_4px_24px_rgba(2,8,23,0.62)]">
              <span className="block">Degrees</span>
              <span className="block">open doors.</span>
              <span className="block bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">Skills create</span>
              <span className="block bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">careers.</span>
            </h1>
            <p className="hero-description max-w-[28rem] text-[15px] leading-[1.72] text-[rgba(255,255,255,0.82)] [text-shadow:0_2px_12px_rgba(2,8,23,0.5)]">
              Learn in-demand skills in technology, design, business and more through structured courses, mentor guidance and career support.
            </p>
            <div className="hero-actions flex flex-col gap-4 sm:flex-row">
              <Link
                to={routes.courses}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/15 bg-gradient-to-r from-accent to-secondary px-7 text-[14px] font-bold text-primary-foreground shadow-[0_12px_30px_rgba(17,71,255,0.34)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore Courses <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to={routes.signup}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/[0.22] bg-white/[0.07] px-7 text-[14px] font-bold text-primary-foreground backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who it's for + live stats ────────────────────────────────────── */}
      <section className="bg-primary px-4 pb-14 pt-12 text-primary-foreground sm:px-6 lg:px-8" aria-labelledby="home-stats-heading">
        <div className="mx-auto max-w-[1280px]">
          <h2 id="home-stats-heading" className="sr-only">SkillGuru at a glance</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary-foreground/75">
            <span className="mr-1 font-black text-primary-foreground">Built for</span>
            {AUDIENCES.map((a) => (
              <span key={a} className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1">{a}</span>
            ))}
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.06] p-5">
                <Icon className="size-5 text-accent" aria-hidden="true" />
                <dd className="mt-3 text-3xl font-black leading-none">{value}</dd>
                <dt className="mt-2 text-sm font-semibold text-primary-foreground/70">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="bg-muted px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="home-categories-heading">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">What you can learn</p>
              <h2 id="home-categories-heading" className="mt-3 text-3xl font-black text-primary sm:text-4xl">Browse by category</h2>
            </div>
            <Link to={routes.courses} className="inline-flex items-center gap-2 text-sm font-black text-secondary hover:underline">
              All courses <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {overview.isLoading ? (
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : overview.isError ? (
            <p className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm font-semibold text-destructive-text">
              Categories couldn&apos;t be loaded right now.{" "}
              <button type="button" onClick={() => void overview.refetch()} className="font-black underline">Try again</button>
            </p>
          ) : topCategories.length === 0 ? (
            <p className="mt-8 text-sm font-semibold text-muted-foreground">No published courses yet.</p>
          ) : (
            <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {topCategories.map((cat) => {
                const Icon = (cat.icon && CATEGORY_ICONS[cat.icon]) || BookOpen;
                return (
                  <li key={cat.id}>
                    <Link
                      to={`${routes.courses}?category=${encodeURIComponent(cat.slug)}`}
                      className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="grid size-10 place-items-center rounded-lg bg-secondary/10 text-secondary">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-black leading-tight text-primary">{cat.name}</span>
                      <span className="mt-auto text-xs font-semibold text-muted-foreground">
                        {cat.courseCount} course{cat.courseCount === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── Featured courses ─────────────────────────────────────────────── */}
      <section className="bg-background px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="home-courses-heading">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Explore courses</p>
              <h2 id="home-courses-heading" className="mt-3 text-3xl font-black text-primary sm:text-4xl">Featured courses</h2>
            </div>
            <Link to={routes.courses} className="inline-flex items-center gap-2 text-sm font-black text-secondary hover:underline">
              View all courses <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {featured.isLoading ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[420px] rounded-xl" />)}
            </div>
          ) : featured.isError ? (
            <p className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm font-semibold text-destructive-text">
              Courses couldn&apos;t be loaded right now.{" "}
              <button type="button" onClick={() => void featured.refetch()} className="font-black underline">Try again</button>
            </p>
          ) : (featured.data?.data.length ?? 0) === 0 ? (
            <p className="mt-8 text-sm font-semibold text-muted-foreground">No published courses yet.</p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.data!.data.map((course) => <PublicCourseCard key={course.id} course={course} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-muted px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="home-how-heading">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">How it works</p>
          <h2 id="home-how-heading" className="mt-3 text-3xl font-black text-primary sm:text-4xl">From first lesson to certificate</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ title, description, icon: Icon }, i) => (
              <li key={title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground" aria-hidden="true">{i + 1}</span>
                  <Icon className="size-5 text-secondary" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-black text-primary">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="bg-background px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="home-why-heading">
        <div className="mx-auto max-w-[1280px]">
          <GsapReveal className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Why SkillGuru</p>
            <h2 id="home-why-heading" className="mt-3 text-3xl font-black text-primary sm:text-4xl">Everything you need to learn and get hired</h2>
          </GsapReveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <span className="grid size-11 place-items-center rounded-lg bg-secondary/10 text-secondary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-black text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mentors ──────────────────────────────────────────────────────── */}
      {(mentors.data?.length ?? 0) > 0 && (
        <section className="bg-muted px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="home-mentors-heading">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Mentors</p>
                <h2 id="home-mentors-heading" className="mt-3 text-3xl font-black text-primary sm:text-4xl">Learn with guidance</h2>
              </div>
              <Link to={routes.mentors} className="inline-flex items-center gap-2 text-sm font-black text-secondary hover:underline">
                All mentors <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {mentors.data!.slice(0, 3).map((mentor) => <MentorCard key={mentor.slug} mentor={mentor} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" ref={faqRef} className="scroll-mt-24 bg-background px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="home-faq-heading">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">FAQ</p>
          <h2 id="home-faq-heading" className="mt-3 text-3xl font-black text-primary sm:text-4xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-8 rounded-xl border border-border bg-card px-5">
            {PLATFORM_FAQS.map((item, i) => (
              <AccordionItem key={item.question} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-black text-primary">{item.question}</AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <CTABanner title="Ready to start learning?" description="Create a free account to enroll, or talk to a counsellor to find the right course for your goals." />
    </main>
  );
}
