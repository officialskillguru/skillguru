import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CirclePlay,
  FileCheck2,
  Handshake,
  Linkedin,
  MessageCircle,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import { CTAButton } from "@/components/common/CTAButton";
import { CTABanner } from "@/components/site/CTABanner";
import { faqs, recruiterLogos, recruiters, successStories } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";
import { placementStoryId } from "@/lib/placement-stories";
import { placementStoryRoute, routes } from "@/lib/routes";

const placementStats = [
  { value: 10000, suffix: "+", label: "Students Trained", icon: Users },
  { value: 7200, suffix: "+", label: "Students Placed", icon: BadgeCheck },
  { value: 95, suffix: "%", label: "Placement Rate", icon: TrendingUp },
  { value: 18, suffix: " LPA", label: "Highest Package", icon: BriefcaseBusiness },
  { value: 8.5, suffix: " LPA", label: "Average Package", icon: Sparkles },
  { value: 500, suffix: "+", label: "Hiring Partners", icon: Building2 },
] as const;

const journey = [
  ["Before Joining", "Understand career goals, skill gaps, and target roles."],
  ["Learning", "Build job-ready skills through mentor-led training."],
  ["Projects", "Create practical proof that recruiters can evaluate."],
  ["Interview Prep", "Practice resumes, mock interviews, and role conversations."],
  ["Placement", "Connect with hiring partners and convert interviews into offers."],
] as const;

const support = [
  { title: "Resume Building", description: "Recruiter-ready resumes mapped to the target role.", icon: FileCheck2 },
  { title: "Mock Interviews", description: "Structured interview practice with feedback loops.", icon: MessageCircle },
  { title: "Career Mentorship", description: "One-to-one guidance from mentors and placement experts.", icon: Users },
  { title: "LinkedIn Optimization", description: "Profile positioning for inbound recruiter visibility.", icon: Linkedin },
  { title: "Job Referrals", description: "Curated opportunities from active hiring partners.", icon: Handshake },
] as const;

function RecruiterLogo({ name }: Readonly<{ name: string }>) {
  const src = recruiterLogos[name as keyof typeof recruiterLogos];
  return src ? <img src={src} alt={name} className="h-9 max-w-[8.5rem] object-contain" loading="lazy" /> : <span className="font-black">{name}</span>;
}

export default function PlacementsPage() {
  usePageMeta("Placements");
  const pageRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let disposed = false;

    async function run() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);
      const root = pageRef.current;
      const marquee = marqueeRef.current;

      const ctx = gsap.context(() => {
        gsap.fromTo(".placement-reveal", { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.08, ease: "power3.out" });

        gsap.fromTo(
          ".placement-card",
          { autoAlpha: 0, y: 34, scale: 0.97, filter: "blur(8px)" },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.78,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: ".placement-stories", start: "top 78%", once: true },
          },
        );

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((node) => {
          const target = Number(node.dataset.count ?? 0);
          const state = { value: 0 };
          gsap.to(state, {
            value: target,
            duration: 1.5,
            ease: "power2.out",
            scrollTrigger: { trigger: node, start: "top 86%", once: true },
            onUpdate: () => {
              node.textContent = target % 1 === 0 ? Math.round(state.value).toLocaleString("en-IN") : state.value.toFixed(1);
            },
          });
        });

        if (marquee) {
          gsap.to(marquee, { xPercent: -50, duration: 30, ease: "none", repeat: -1 });
        }
      }, root ?? undefined);

      cleanup = () => ctx.revert();
    }

    void run();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <main ref={pageRef} className="page-shell overflow-x-clip">
      <section className="relative isolate overflow-hidden bg-primary px-4 py-16 text-primary-foreground sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(25,217,255,0.24),transparent_28rem)]" />
        <div className="relative mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="placement-reveal text-xs font-black uppercase tracking-[0.22em] text-accent">Placements</p>
            <h1 className="placement-reveal mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Our Placement Success Stories</h1>
            <p className="placement-reveal mt-5 max-w-xl text-base leading-8 text-primary-foreground/76">
              Discover how SkillGuru students transformed their careers and landed opportunities at top companies.
            </p>
            <a href="#success-stories" className="placement-reveal mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-accent px-5 text-sm font-bold text-primary transition duration-300 hover:-translate-y-1 hover:bg-primary-foreground hover:text-primary">
              Explore Success Stories
              <ArrowRight className="size-4" />
            </a>
          </div>
          <div className="placement-reveal grid gap-4 sm:grid-cols-2">
            {successStories.slice(0, 4).map((story) => (
              <article key={story.name} className="rounded-[20px] border border-white/15 bg-white/5 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <img src={story.avatar} alt={story.name} className="size-14 rounded-full object-cover ring-4 ring-white/10" />
                  <div>
                    <h2 className="font-black">{story.name}</h2>
                    <p className="text-sm text-accent">{story.company}</p>
                  </div>
                </div>
                <p className="mt-5 text-3xl font-black text-accent">{story.package}</p>
                <p className="mt-1 text-sm text-primary-foreground/68">{story.course}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card px-4 pb-12 pt-10 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-24">
        <div className="mx-auto grid max-w-[1280px] gap-4 rounded-[24px] border border-border bg-card p-5 shadow-[0_24px_80px_rgba(10,42,136,0.14)] sm:grid-cols-2 lg:grid-cols-6">
          {placementStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article key={stat.label} className="rounded-[18px] bg-muted p-5">
                <Icon className="size-5 text-secondary" />
                <p className="mt-4 text-2xl font-black text-primary">
                  <span data-count={stat.value}>0</span>{stat.suffix}
                </p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">{stat.label}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="success-stories" className="placement-stories bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-[90px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Success Stories</p>
              <h2 className="mt-4 text-3xl font-black text-primary sm:text-5xl">Student Outcomes, In One Place</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">Every story connects training, mentorship, projects, and placement support into a measurable career result.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {successStories.map((story) => (
              <article key={story.name} className="placement-card premium-surface overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_18px_55px_rgba(10,42,136,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_78px_rgba(17,71,255,0.15)]">
                <div className="relative h-40 bg-primary">
                  <img src={story.avatar} alt={story.name} className="size-full object-cover object-top opacity-92" loading="lazy" />
                  <span className="absolute left-4 top-4 rounded-full bg-card px-3 py-1 text-xs font-black text-primary">{story.package}</span>
                  <img src={story.companyLogo} alt={story.company} className="absolute bottom-4 right-4 h-8 max-w-24 rounded-lg bg-card p-1.5 object-contain" />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-black text-primary">{story.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-secondary">{story.course}</p>
                  <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                    <span>Company <strong className="block text-primary">{story.company}</strong></span>
                    <span>Location <strong className="block text-primary">India</strong></span>
                  </div>
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-foreground/80">{story.quote}</p>
                  <Link to={placementStoryRoute(placementStoryId(story))} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-secondary">
                    Watch Story <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:px-6 lg:px-8 lg:py-[90px]">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-secondary">Video Testimonials</p>
          <h2 className="mt-4 text-center text-3xl font-black text-primary sm:text-5xl">Student Experience Videos</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {successStories.slice(0, 3).map((story) => (
              <article key={story.name} className="premium-surface overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
                <div className="relative h-56 bg-primary">
                  <img src={story.avatar} alt={story.name} className="size-full object-cover object-top opacity-80" loading="lazy" />
                  <button type="button" className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card/92 text-secondary shadow-[0_18px_50px_rgba(0,0,0,0.22)] hover:bg-card transition-colors" aria-label={`Play ${story.name} story`}>
                    <CirclePlay className="size-8" />
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="font-black text-primary">{story.name}</h3>
                  <p className="text-sm font-semibold text-muted-foreground">{story.company}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[24px] border border-border bg-card p-6 shadow-[0_20px_70px_rgba(10,42,136,0.1)]">
          <p className="text-center text-sm font-black text-primary">Hiring Partners</p>
          <div className="mt-6 overflow-hidden">
            <div ref={marqueeRef} className="flex w-max items-center gap-5">
              {[...recruiters, ...recruiters, ...recruiters].map((partner, index) => (
                <div key={`${partner}-${index}`} className="grid h-16 w-40 shrink-0 place-items-center rounded-[16px] border border-border bg-card px-5">
                  <RecruiterLogo name={partner} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:px-6 lg:px-8 lg:py-[90px]">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-secondary">Career Transformation Journey</p>
          <h2 className="mt-4 text-center text-3xl font-black text-primary sm:text-5xl">Before Joining to Placement</h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-5">
            {journey.map(([title, description], index) => (
              <article key={title} className="relative rounded-[20px] border border-border bg-card p-6 text-center shadow-[0_16px_50px_rgba(10,42,136,0.08)]">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-lg font-black text-primary-foreground">{index + 1}</span>
                <h3 className="mt-5 font-black text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-[90px]">
        <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Student Reviews</p>
            <h2 className="mt-4 text-3xl font-black text-primary sm:text-5xl">Trusted by Career Switchers</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">Placement feedback from students who used mentorship, projects, and interview preparation to move forward.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {successStories.slice(0, 4).map((story) => (
              <article key={story.name} className="rounded-[20px] border border-border bg-card p-5 shadow-[0_16px_50px_rgba(10,42,136,0.08)]">
                <div className="flex gap-1 text-amber-400">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="size-4 fill-current" />)}</div>
                <p className="mt-4 text-sm leading-7 text-foreground/80">"{story.quote}"</p>
                <p className="mt-4 text-sm font-black text-primary">- {story.name}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:px-6 lg:px-8 lg:py-[90px]">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-secondary">Placement Support</p>
          <h2 className="mt-4 text-center text-3xl font-black text-primary sm:text-5xl">Support Built Around Hiring</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-5">
            {support.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="premium-surface rounded-[20px] border border-border bg-card p-5 shadow-[0_16px_45px_rgba(10,42,136,0.07)]">
                  <Icon className="size-6 text-secondary" />
                  <h3 className="mt-5 font-black text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-[90px]">
        <div className="mx-auto max-w-[920px]">
          <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-secondary">Placement FAQ</p>
          <h2 className="mt-4 text-center text-3xl font-black text-primary sm:text-5xl">Questions Before You Start</h2>
          <div className="mt-10 divide-y divide-border overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
            {faqs.slice(0, 5).map((faq, index) => (
              <details key={faq.question} className="group p-5" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-primary">
                  {faq.question}
                  <span className="text-secondary transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:px-6 lg:px-8">
        <div className="brand-gradient mx-auto grid max-w-[1280px] gap-6 rounded-[24px] p-7 text-primary-foreground shadow-[0_24px_80px_rgba(10,42,136,0.2)] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">Build your placement plan with SkillGuru.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-primary-foreground/74">Talk to a counsellor and choose the right course, projects, and placement roadmap for your target role.</p>
          </div>
          <CTAButton to={routes.freeCounselling} className="bg-accent text-primary hover:bg-primary-foreground hover:text-primary">
            Book Free Career Counselling
          </CTAButton>
        </div>
      </section>

      <CTABanner title="Your career transformation can start today" description="Explore guided programs with mentorship, projects, and placement support." />
    </main>
  );
}
