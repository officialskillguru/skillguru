import { BarChart3, BookOpenCheck, MessageSquare, Star, Users } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";

const mentorMetrics = [
  { label: "Assigned Courses", value: "4", icon: BookOpenCheck },
  { label: "Active Students", value: "128", icon: Users },
  { label: "Reviews", value: "36", icon: Star },
  { label: "Analytics Views", value: "12", icon: BarChart3 },
];

export default function MentorDashboardPage() {
  usePageMeta("Mentor Dashboard");
  const auth = useAuth();

  return (
    <main className="min-h-svh bg-[#F8FAFC]">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm text-[#6B7280]">Welcome back, Mentor</p>
            <h1 className="text-2xl font-black text-[#111827]">{auth.user?.email ?? "Mentor"}</h1>
          </div>
          <button type="button" onClick={() => void auth.signOut()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-[#111827]">Sign out</button>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr_320px] lg:px-8">
        <aside className="h-max rounded-2xl bg-[#031B34] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#4DE2FF]">Mentor</p>
          <nav className="mt-6 grid gap-2 text-sm font-bold text-white/70">
            {["Overview", "Assigned Courses", "Students", "Reviews", "Analytics", "Profile"].map((item) => (
              <span key={item} className="rounded-xl px-3 py-2 hover:bg-white/10">{item}</span>
            ))}
          </nav>
        </aside>
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {mentorMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon className="size-7 text-[#007BFF]" />
                  <p className="mt-4 text-3xl font-black text-[#111827]">{metric.value}</p>
                  <p className="mt-1 text-sm font-bold text-[#6B7280]">{metric.label}</p>
                </article>
              );
            })}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Assigned course activity</h2>
              <BookOpenCheck className="size-6 text-[#007BFF]" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {["Review pending submissions", "Update professional profile", "Respond to student reviews"].map((task) => (
                <p key={task} className="rounded-xl bg-[#EEF4FF] p-4 text-sm font-bold text-[#111827]">{task}</p>
              ))}
            </div>
          </div>
          <article className="rounded-2xl bg-[#031B34] p-6 text-white">
            <BarChart3 className="size-8 text-[#4DE2FF]" />
            <h2 className="mt-5 text-2xl font-black">Mentor Analytics</h2>
            <p className="mt-3 text-white/65">Track student progress, review volume, course engagement and feedback trends.</p>
          </article>
        </section>
        <aside className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <MessageSquare className="size-7 text-[#007BFF]" />
            <h2 className="mt-5 text-xl font-black">Student Updates</h2>
            <div className="mt-5 space-y-3 text-sm text-[#6B7280]">
              <p>Three learners submitted project reviews.</p>
              <p>Two feedback requests are awaiting response.</p>
              <p>One course milestone needs mentor confirmation.</p>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Star className="size-7 text-[#007BFF]" />
            <h2 className="mt-5 text-xl font-black">Reviews</h2>
            <p className="mt-3 text-sm text-[#6B7280]">Average learner rating and latest feedback will appear here after Supabase records are connected.</p>
          </article>
        </aside>
      </div>
    </main>
  );
}
