import { useState } from "react";
import { BarChart3, BookOpenCheck, Star, Users, CheckCircle, Video, PlayCircle } from "lucide-react";

import { Bell, UserCircle } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { 
  useMentorDashboardMetrics, 
  useMentorCourses, 
  useMentorStudents, 
  useMentorAnalytics,
  useMentorProfileId
} from "@/hooks/useMentorPortal";
import { PageLoader } from "@/components/common/PageLoader";

const tabs = ["Overview", "Assigned Courses", "Students", "Analytics", "Notifications", "Profile"] as const;
type TabType = typeof tabs[number];

export default function MentorDashboardPage() {
  usePageMeta("Mentor Dashboard");
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("Overview");

  if (auth.status === "INITIALIZING" as string || auth.status === "AUTHENTICATING" as string || auth.status === "LOADING_PROFILE" as string) return <PageLoader />;

  return (
    <main className="min-h-svh bg-muted">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back, Mentor</p>
            <h1 className="text-2xl font-black text-foreground">{auth.user?.email ?? "Mentor"}</h1>
          </div>
          <button type="button" onClick={() => void auth.logout()} className="rounded-md border border-border px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Sign out</button>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="h-max rounded-xl bg-primary p-5 text-primary-foreground shadow-md">
          <p className="text-xs font-black uppercase tracking-widest text-accent">Mentor</p>
          <nav className="mt-6 grid gap-2 text-sm font-bold text-primary-foreground/70">
            {tabs.map((item) => (
              <button 
                key={item} 
                onClick={() => setActiveTab(item)}
                className={`rounded-md px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeTab === item ? "bg-white/20 text-primary-foreground" : "hover:bg-white/10 hover:text-primary-foreground"}`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>
        
        <section className="space-y-6">
          {activeTab === "Overview" && <OverviewTab />}
          {activeTab === "Assigned Courses" && <CoursesTab />}
          {activeTab === "Students" && <StudentsTab />}
          {activeTab === "Analytics" && <AnalyticsTab />}
          {activeTab === "Notifications" && <NotificationsTab />}
          {activeTab === "Profile" && <ProfileTab />}
        </section>
      </div>
    </main>
  );
}

function OverviewTab() {
  const { data: metrics, isLoading } = useMentorDashboardMetrics();

  if (isLoading) return <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading metrics...</div>;
  if (!metrics) return <div className="py-12 text-center text-sm font-semibold text-slate-400">No data available</div>;

  const mentorMetrics = [
    { label: "Assigned Courses", value: metrics.totalCourses, icon: BookOpenCheck },
    { label: "Active Students", value: metrics.activeStudents, icon: Users },
    { label: "Reviews", value: metrics.reviews, icon: Star },
    { label: "Analytics Views", value: metrics.analyticsViews, icon: BarChart3 },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mentorMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <Icon className="size-7 text-primary" />
              <p className="mt-4 text-3xl font-black text-foreground">{metric.value}</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{metric.label}</p>
            </article>
          );
        })}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-foreground">Quick Actions</h2>
          <BookOpenCheck className="size-6 text-primary" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Review pending submissions", "Schedule live session", "Respond to student queries"].map((task) => (
            <p key={task} className="rounded-md bg-secondary/10 p-4 text-sm font-bold text-foreground">{task}</p>
          ))}
        </div>
      </div>
      <article className="rounded-xl bg-primary p-6 text-primary-foreground shadow-md">
        <BarChart3 className="size-8 text-accent" />
        <h2 className="mt-5 text-2xl font-black">Weekly Progress</h2>
        <p className="mt-3 text-primary-foreground/70">Your students are highly engaged this week. Maintain the momentum with a live Q&A session.</p>
      </article>
    </>
  );
}

function CoursesTab() {
  const { data: courses, isLoading } = useMentorCourses();

  if (isLoading) return <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading courses...</div>;
  if (!courses || courses.length === 0) return <div className="py-12 text-center text-sm font-semibold text-slate-400">No courses assigned to you yet.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Assigned Courses</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map(course => (
          <article key={course.id} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-foreground">{course.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{course.description}</p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${course.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {course.status}
              </span>
              <button className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Video className="size-4" />
                Go to Classroom
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StudentsTab() {
  const { data: enrollments, isLoading } = useMentorStudents();

  if (isLoading) return <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading students...</div>;
  if (!enrollments || enrollments.length === 0) return <div className="py-12 text-center text-sm font-semibold text-slate-400">No active students.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Your Students</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Student Name</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Course</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Enrollment Status</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {enrollments.map((enr) => (
              <tr key={enr.id}>
                <td className="px-6 py-4 font-bold text-foreground">
                  {enr.profile?.full_name || "Unknown Student"}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                  {enr.courses?.title || "Unknown Course"}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
                    enr.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {enr.status === 'completed' ? <CheckCircle className="size-3" /> : <PlayCircle className="size-3" />}
                    {enr.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                  0%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { data: analytics, isLoading } = useMentorAnalytics();

  if (isLoading) return <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading analytics...</div>;
  if (!analytics || analytics.length === 0) return <div className="py-12 text-center text-sm font-semibold text-slate-400">No analytics available.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Course Analytics</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {analytics.map((stats) => (
          <article key={stats.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-black text-foreground">{stats.title}</h3>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Enrollments</p>
                <p className="mt-1 text-xl font-black text-primary">{stats.enrollments}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Completion</p>
                <p className="mt-1 text-xl font-black text-emerald-600">{stats.completionRate}%</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Avg Rating</p>
                <p className="mt-1 text-xl font-black text-amber-500">{stats.averageRating}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Notifications</h2>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <Bell className="mx-auto size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-black text-foreground">All Caught Up</h3>
          <p className="mt-2 text-sm text-muted-foreground">You don't have any new notifications.</p>
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { data: mentorId, isLoading } = useMentorProfileId();
  
  if (isLoading) return <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading profile...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Mentor Profile</h2>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex size-24 items-center justify-center rounded-full bg-muted border border-border">
            <UserCircle className="size-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground">Mentor Account</h3>
            <p className="text-sm text-muted-foreground">ID: {mentorId}</p>
            <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Edit Profile details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
