import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, ShieldCheck, Users } from "lucide-react";

import { GsapReveal } from "@/components/motion/gsap-reveal";
import { CourseCard } from "@/components/cards/CourseCard";
import { MentorCard } from "@/components/cards/MentorCard";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { CTABanner } from "@/components/site/CTABanner";
import { courses, mentors, recruiterLogos, recruiters, stats, successStories, whyChooseUs } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";
import { assetUrl } from "@/lib/asset-url";
import { routes } from "@/lib/routes";

function RecruiterLogo({ name }: Readonly<{ name: string }>) {
  const src = recruiterLogos[name as keyof typeof recruiterLogos];
  return src ? <img src={src} alt={name} className="h-9 max-w-[8.5rem] object-contain" loading="lazy" /> : <span className="font-black">{name}</span>;
}

export default function HomePage() {
  usePageMeta("Career Transformation Platform");
  const recruiterTrackRef = useRef<HTMLDivElement>(null);
  const recruiterShellRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);

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
      const recruiterTrack = recruiterTrackRef.current;
      const recruiterShell = recruiterShellRef.current;
      const stats = statsRef.current;
      const listeners: Array<() => void> = [];

      const ctx = gsap.context(() => {
        if (recruiterTrack) {
          const marquee = gsap.to(recruiterTrack, {
            xPercent: -50,
            duration: 32,
            ease: "none",
            repeat: -1,
          });

          if (recruiterShell) {
            const pauseMarquee = () => {
              marquee.pause();
            };
            const resumeMarquee = () => {
              marquee.resume();
            };
            recruiterShell.addEventListener("mouseenter", pauseMarquee);
            recruiterShell.addEventListener("mouseleave", resumeMarquee);
            listeners.push(() => {
              recruiterShell.removeEventListener("mouseenter", pauseMarquee);
              recruiterShell.removeEventListener("mouseleave", resumeMarquee);
            });
          }
        }

        if (stats) {
          gsap.fromTo(
            stats.querySelectorAll(".premium-stat-card"),
            { autoAlpha: 0, y: 28, scale: 0.96, filter: "blur(8px)" },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.78,
              stagger: 0.09,
              ease: "power3.out",
              scrollTrigger: { trigger: stats, start: "top 82%", once: true },
            },
          );
        }
      });

      cleanup = () => {
        listeners.forEach((listener) => listener());
        ctx.revert();
      };
    }

    void run();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <main className="page-shell overflow-x-clip">
      <section className="hero-section relative isolate overflow-hidden bg-primary text-primary-foreground">
        <div className="hero-media">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={assetUrl("/assets/home/hero-career-roadmap-poster.jpg")}
            aria-hidden="true"
          >
            <source src={assetUrl("/assets/home/hero-career-roadmap.mp4")} type="video/mp4" />
          </video>
          <span className="hero-media-vignette" aria-hidden="true" />
        </div>
        <div className="hero-video-glow" aria-hidden="true" />
        <div className="hero-left-overlay" aria-hidden="true" />
        <div className="hero-depth-overlay" aria-hidden="true" />

        <div className="hero-content relative z-[3] mx-auto flex h-full max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
          <div className="hero-copy relative z-10 w-full">
            <p className="hero-trust-badge inline-flex items-center gap-2.5 rounded-full border border-secondary/55 bg-secondary/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-[inset_0_0_14px_rgba(25,217,255,0.08),0_0_20px_rgba(17,71,255,0.18)] backdrop-blur-sm">
              <ShieldCheck className="size-3.5 text-accent" />
              India&apos;s Most Trusted
            </p>
            <h1 className="hero-heading font-[900] text-primary-foreground [text-shadow:0_4px_24px_rgba(2,8,23,0.62)]">
              <span className="block">Degrees</span>
              <span className="block">open doors.</span>
              <span className="block bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">
                Skills create
              </span>
              <span className="block bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">
                careers.
              </span>
            </h1>
            <p className="hero-description max-w-[26rem] text-[15px] leading-[1.72] text-[rgba(255,255,255,0.78)] [text-shadow:0_2px_12px_rgba(2,8,23,0.5)]">
              Industry-focused training, real-world projects, expert mentorship and placement support to make you industry-ready.
            </p>
            <div className="hero-actions flex flex-col gap-4 sm:flex-row">
              <Link
                to={routes.freeCounselling}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/15 bg-gradient-to-r from-accent to-secondary px-7 text-[14px] font-bold text-primary-foreground shadow-[0_12px_30px_rgba(17,71,255,0.34)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(25,217,255,0.28)]"
              >
                Book Free Counselling <ArrowRight className="size-4" />
              </Link>
              <Link
                to={routes.courses}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-white/[0.22] bg-white/[0.07] px-7 text-[14px] font-bold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12]"
              >
                Explore Courses <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section ref={recruiterShellRef} className="recruiter-marquee-section relative z-20 mx-auto mt-10 max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="recruiter-marquee-shell flex flex-col gap-5 overflow-hidden rounded-[24px] border border-white/60 bg-white/78 px-6 py-5 shadow-[0_24px_70px_rgba(10,42,136,0.14)] backdrop-blur-2xl md:flex-row md:items-center">
          <div className="flex shrink-0 items-center md:border-r md:border-border md:pr-7">
            <span className="text-[12px] font-black uppercase tracking-[0.18em] text-primary">Our Top Recruiters</span>
          </div>
          <div className="recruiter-marquee-window min-w-0 flex-1 overflow-hidden md:pl-1">
            <div ref={recruiterTrackRef} className="recruiter-marquee-track flex w-max items-center gap-5">
              {[...recruiters, ...recruiters, ...recruiters].map((partner, index) => (
                <div key={`${partner}-${index}`} className="recruiter-logo-tile grid h-14 w-36 shrink-0 place-items-center rounded-[16px] border border-border/80 bg-white/74 px-5 transition duration-300 hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-[0_14px_34px_rgba(25,217,255,0.2)]">
                  <RecruiterLogo name={partner} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section ref={statsRef} className="stats-section relative overflow-hidden bg-primary px-4 pb-16 pt-20 sm:px-6 lg:px-8 text-primary-foreground">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} className="premium-stat-card group relative overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.065] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-accent/45 hover:bg-white/[0.09] hover:shadow-[0_24px_78px_rgba(25,217,255,0.12)]">
                  <span className="relative z-10 grid size-12 place-items-center rounded-[14px] border border-accent/25 bg-accent/10 text-accent shadow-[0_0_24px_rgba(25,217,255,0.14)] transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_34px_rgba(25,217,255,0.24)]">
                    <Icon className="size-5 transition duration-300 group-hover:rotate-3" />
                  </span>
                  <div className="relative z-10 mt-5">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} className="block text-[clamp(2rem,4vw,3rem)] font-black leading-none text-primary-foreground" />
                    <span className="mt-2 block text-sm font-semibold text-primary-foreground/65">{stat.label}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-[100px]">
        <div className="mx-auto max-w-[1280px]">
          <GsapReveal className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Why Choose SkillGuru</p>
            <h2 className="mt-4 text-3xl font-black text-primary sm:text-5xl">We Don&apos;t Just Teach. We Transform</h2>
          </GsapReveal>
          <GsapReveal stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {whyChooseUs.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="premium-surface rounded-xl border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent/45 hover:shadow-md">
                  <span className="grid size-12 place-items-center rounded-lg bg-secondary/10 text-secondary">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </article>
              );
            })}
          </GsapReveal>
        </div>
      </section>

      <section className="bg-background px-4 py-12 sm:px-6 lg:px-8 lg:py-[100px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Explore Courses</p>
              <h2 className="mt-4 text-3xl font-black text-primary sm:text-5xl">Industry-Relevant Courses</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">Choose from career tracks designed around skills recruiters can understand.</p>
            </div>
            <Link to={routes.courses} className="inline-flex items-center gap-2 text-sm font-black text-secondary hover:text-secondary/80">
              View All Courses <ArrowRight className="size-4" />
            </Link>
          </div>
          <GsapReveal stagger className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {courses.slice(0, 4).map((course) => <CourseCard key={course.slug} course={course} />)}
          </GsapReveal>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8">
        <div className="premium-surface mx-auto max-w-[1280px] rounded-xl border border-border bg-card p-7 shadow-sm">
          <p className="text-center text-sm font-black text-primary">Top Hiring Partners</p>
          <div className="mt-6 grid grid-cols-2 items-center gap-8 md:grid-cols-4 lg:grid-cols-8">
            {recruiters.slice(0, 8).map((partner) => (
              <div key={partner} className="grid min-h-12 place-items-center">
                <RecruiterLogo name={partner} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background px-4 py-12 sm:px-6 lg:px-8 lg:py-[100px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Success Stories Preview</p>
              <h2 className="mt-4 text-3xl font-black text-primary sm:text-5xl">From Learners to Achievers</h2>
              <GsapReveal stagger className="mt-8 grid gap-5 md:grid-cols-2">
                {successStories.slice(0, 2).map((story) => (
                  <article key={story.name} className="premium-surface rounded-xl border border-border bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent/45 hover:shadow-md">
                    <div className="flex gap-4">
                      <img src={story.avatar} alt="" className="size-24 rounded-lg object-cover transition duration-500 hover:scale-105" />
                      <div>
                        <h3 className="text-xl font-black text-primary">{story.name}</h3>
                        <p className="text-sm font-semibold text-secondary">{story.role}</p>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-bold text-muted-foreground">
                          <span>Before<strong className="block text-primary">{story.before}</strong></span>
                          <span>After<strong className="block text-primary">{story.after}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-2xl font-black text-emerald-500">{story.package}</span>
                      <img src={story.companyLogo} alt={story.company} className="h-9 max-w-28 object-contain" />
                    </div>
                  </article>
                ))}
              </GsapReveal>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Mentor Preview</p>
              <h2 className="mt-4 text-3xl font-black text-primary">Featured Mentors</h2>
              <div className="mt-8 grid gap-5">
                {mentors.slice(0, 2).map((mentor) => <MentorCard key={mentor.name} mentor={mentor} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1280px] gap-5 md:grid-cols-3">
          {[
            { title: "Industry-Aligned", icon: BriefcaseBusiness },
            { title: "Expert Mentors", icon: Users },
            { title: "Certified Outcomes", icon: CheckCircle2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="premium-surface flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent/45">
                <span className="grid size-12 place-items-center rounded-full bg-secondary/10 text-secondary">
                  <Icon className="size-5" />
                </span>
                <span className="font-black text-primary">{item.title}</span>
              </article>
            );
          })}
        </div>
      </section>

      <CTABanner />
    </main>
  );
}
