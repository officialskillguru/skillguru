import { BarChart3, BookOpenCheck, Star, Users } from "lucide-react";
import { useMentorDashboardMetrics } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewTab() {
  const { data: metrics, isLoading } = useMentorDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!metrics) return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">No data available</div>;

  const mentorMetrics = [
    { label: "Assigned Courses", value: metrics.totalCourses, icon: BookOpenCheck },
    { label: "Active Students", value: metrics.activeStudents, icon: Users },
    { label: "Reviews", value: metrics.reviews, icon: Star },
    { label: "Completed Enrollments", value: metrics.completedEnrollments, icon: BarChart3 },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mentorMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <Icon className="size-7 text-primary" aria-hidden="true" />
              <p className="mt-4 text-3xl font-black text-foreground">{metric.value}</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{metric.label}</p>
            </article>
          );
        })}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-foreground">Quick Actions</h2>
          <BookOpenCheck className="size-6 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Review pending submissions", "Schedule live session", "Respond to student queries"].map((task) => (
            <p key={task} className="rounded-md bg-secondary/10 p-4 text-sm font-bold text-foreground">{task}</p>
          ))}
        </div>
      </div>
      <article className="rounded-xl bg-primary p-6 text-primary-foreground shadow-md">
        <BarChart3 className="size-8 text-accent" aria-hidden="true" />
        <h2 className="mt-5 text-2xl font-black">Weekly Progress</h2>
        <p className="mt-3 text-primary-foreground/70">Your students are highly engaged this week. Maintain the momentum with a live Q&A session.</p>
      </article>
    </>
  );
}
