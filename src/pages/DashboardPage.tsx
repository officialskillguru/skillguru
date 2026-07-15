import { Bell, Bot, CheckCircle2, FileText, PlayCircle, Trophy } from "lucide-react";

import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { useAuth } from "@/hooks/useAuth";
import { dashboardMetrics } from "@/data/platform";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function DashboardPage() {
  usePageMeta("Learner Dashboard");
  const auth = useAuth();

  return (
    <main className="min-h-svh bg-[#F8FAFC]">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm text-[#64748B]">Welcome back</p>
            <h1 className="text-2xl font-black text-[#0F172A]">{auth.user?.email ?? "Learner"}</h1>
          </div>
          <button type="button" onClick={() => void (auth as unknown as {signOut: () => void}).signOut()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-[#0F172A]">Sign out</button>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr_320px] lg:px-8">
        <aside className="h-max rounded-2xl bg-[#031B34] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#4DE2FF]">Dashboard</p>
          <nav className="mt-6 grid gap-2 text-sm font-bold text-white/70">
            {["Overview", "My Courses", "Assignments", "Certificates", "Placement", "Settings"].map((item) => (
              <span key={item} className="rounded-xl px-3 py-2 hover:bg-white/10">{item}</span>
            ))}
          </nav>
        </aside>
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardMetrics.map((metric) => <DashboardWidget key={metric.label} metric={metric} />)}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Current course progress</h2>
              <PlayCircle className="size-6 text-[#007BFF]" />
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#00C2FF] to-[#2563EB]" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {["React project review", "Data structures assignment", "Mock interview slot"].map((task) => (
                <p key={task} className="flex gap-3 rounded-xl bg-[#EEF4FF] p-4 text-sm font-bold text-[#0F172A]">
                  <CheckCircle2 className="size-5 text-[#007BFF]" />
                  {task}
                </p>
              ))}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl bg-[#031B34] p-6 text-white">
              <Bot className="size-8 text-[#4DE2FF]" />
              <h2 className="mt-5 text-2xl font-black">AI Mentor</h2>
              <p className="mt-3 text-white/65">Recommended today: revise React hooks, complete one portfolio note, and practice two interview answers.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <Trophy className="size-8 text-[#007BFF]" />
              <h2 className="mt-5 text-2xl font-black">Certificates</h2>
              <p className="mt-3 text-[#64748B]">Full Stack Foundation certificate is ready for mentor approval.</p>
            </article>
          </div>
        </section>
        <aside className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Bell className="size-7 text-[#007BFF]" />
            <h2 className="mt-5 text-xl font-black">Notifications</h2>
            <div className="mt-5 space-y-3 text-sm text-[#64748B]">
              <p>Mentor feedback added to assignment 4.</p>
              <p>Placement workshop starts Friday.</p>
              <p>Certificate verification pending.</p>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <FileText className="size-7 text-[#007BFF]" />
            <h2 className="mt-5 text-xl font-black">Placement tracking</h2>
            <p className="mt-3 text-sm text-[#64748B]">Resume: approved. Mock interview: scheduled. Recruiter list: in progress.</p>
          </article>
        </aside>
      </div>
    </main>
  );
}
