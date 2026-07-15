import { Award, Building2, HeartHandshake, Lightbulb, ShieldCheck, Sparkles, Target, Users } from "lucide-react";

import { MentorCard } from "@/components/cards/MentorCard";
import { CTABanner } from "@/components/site/CTABanner";
import { mentors, recruiterLogos, recruiters, stats } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";

const journey = [
  ["2019", "Founded", "Started with practical HR and career readiness training."],
  ["2020", "Expanded", "Added technical learning tracks and mentor-led sessions."],
  ["2021", "Placement Ecosystem", "Built recruiter connects and structured placement support."],
  ["2023", "Digital Growth", "Scaled online, offline, and hybrid learning experiences."],
  ["2025", "AI-Enabled", "Introduced AI-assisted learning roadmaps and analytics."],
];

const valueCards = [
  { title: "Student First", body: "Every decision starts with learner outcomes.", icon: Lightbulb },
  { title: "Excellence", body: "High-quality mentors, projects, and feedback.", icon: Award },
  { title: "Integrity", body: "Transparent guidance and clear expectations.", icon: ShieldCheck },
  { title: "Innovation", body: "Modern tools for practical learning.", icon: Sparkles },
];

export default function AboutPage() {
  usePageMeta("About Us");

  return (
    <main className="page-shell">
      <section className="bg-card px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <h1 className="text-4xl font-black leading-tight text-primary sm:text-6xl">Empowering India&apos;s Career Transformation</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              As India&apos;s go-to platform for education and industry skills, practical training, real-world projects, and placement support, we help learners move from uncertainty to employability.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_14px_40px_rgba(10,42,136,0.07)]">
                    <Icon className="size-5 text-secondary" />
                    <p className="mt-3 text-xl font-black text-primary">{stat.value.toLocaleString("en-IN")}{stat.suffix}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative min-h-90 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_80px_rgba(10,42,136,0.10)]">
            <div className="absolute inset-x-10 bottom-0 h-64 rounded-t-[28px] bg-linear-to-br from-primary to-secondary" />
            <div className="absolute bottom-16 left-1/2 h-44 w-[62%] -translate-x-1/2 rounded-t-[22px] border border-white/30 bg-white/15 backdrop-blur" />
            <div className="absolute right-8 top-8 rounded-2xl bg-card p-5 shadow-[0_18px_55px_rgba(10,42,136,0.12)]">
              <Building2 className="size-8 text-secondary" />
              <p className="mt-3 text-sm font-black text-primary">Career Campus</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-secondary">Our Journey</p>
          <h2 className="mt-4 text-center text-3xl font-black text-primary sm:text-5xl">Built Around Learner Outcomes</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-5">
            {journey.map(([year, title, body], index) => (
              <article key={year} className="relative rounded-lg border border-border bg-card p-5 text-center shadow-[0_16px_45px_rgba(10,42,136,0.07)]">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-sm font-black text-primary-foreground">{index + 1}</span>
                <p className="mt-4 text-lg font-black text-primary">{year}</p>
                <h3 className="mt-2 font-black text-primary">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            { title: "Mission", body: "Make career-ready education practical, clear, and accessible for Indian learners.", icon: Target },
            { title: "Vision", body: "Build a premium learning ecosystem for skills, confidence, and career mobility.", icon: Sparkles },
            { title: "Values", body: "Student first, excellence, integrity, innovation, and measurable outcomes.", icon: HeartHandshake },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-border bg-card p-7 shadow-[0_18px_55px_rgba(10,42,136,0.08)]">
                <Icon className="size-10 rounded-md bg-secondary/10 p-2 text-secondary" />
                <h2 className="mt-6 text-2xl font-black text-primary">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Leadership Team</p>
          <h2 className="mt-4 text-3xl font-black text-primary sm:text-5xl">Mentors, Operators, and Career Builders</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {mentors.map((mentor) => <MentorCard key={mentor.name} mentor={mentor} />)}
          </div>
        </div>
      </section>

      <section className="bg-card px-4 py-12 sm:px-6 lg:px-8 lg:py-25">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { title: "10,000+", body: "Students Trained", icon: Users },
              { title: "500+", body: "Hiring Partners", icon: Building2 },
              { title: "95%", body: "Placement Rate", icon: Award },
              { title: "25+", body: "Cities", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.body} className="rounded-lg border border-border bg-card p-6 text-center shadow-[0_16px_45px_rgba(10,42,136,0.07)]">
                  <Icon className="mx-auto size-8 text-secondary" />
                  <p className="mt-4 text-3xl font-black text-primary">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{item.body}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-12 rounded-lg border border-border bg-card p-7 shadow-[0_18px_60px_rgba(10,42,136,0.08)]">
            <p className="text-center text-sm font-black text-primary">Our Top Recruiters</p>
            <div className="mt-6 grid grid-cols-2 items-center gap-8 md:grid-cols-4 lg:grid-cols-8">
              {recruiters.slice(0, 8).map((partner) => (
                <img key={partner} src={recruiterLogos[partner as keyof typeof recruiterLogos]} alt={partner} className="mx-auto h-9 max-w-32 object-contain" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-4">
          {valueCards.map((item) => {
            const Icon = item.icon;
            return (
            <article key={item.title} className="rounded-lg border border-border bg-card p-6 shadow-[0_16px_45px_rgba(10,42,136,0.07)]">
              <Icon className="size-8 text-secondary" />
              <h3 className="mt-5 font-black text-primary">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
            );
          })}
        </div>
      </section>

      <CTABanner title="Build your career with SkillGuru" description="Talk to our counselling team and choose a learning path aligned to your background and goals." />
    </main>
  );
}
