import { BookOpen, Users, User, LayoutDashboard, CircleDollarSign, Award } from "lucide-react";
import { useDashboardData } from "@/hooks/useAdminData";

export function PlatformOverviewWidget() {
  const { metrics, charts } = useDashboardData();
  const data = metrics.data;
  const totalEnrollments = (charts.data ?? []).reduce((sum, point) => sum + point.enrollments, 0);

  const stats = [
    { label: "Total Courses", value: data?.totalCourses, icon: BookOpen },
    { label: "Total Students", value: data?.totalStudents, icon: Users },
    { label: "Total Mentors", value: data?.totalMentors, icon: User },
    { label: "Enrollments (this year)", value: totalEnrollments, icon: LayoutDashboard },
    { label: "Total Revenue", value: data ? `₹${(data.totalRevenue / 100).toLocaleString("en-IN")}` : undefined, icon: CircleDollarSign },
    { label: "Certificates Issued", value: data?.certificatesIssued, icon: Award },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col h-full">
      <h2 className="text-base font-black text-foreground tracking-tight mb-4">Platform Overview</h2>
      <div className="flex flex-col divide-y divide-border">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-sm text-foreground/80 font-medium">{stat.label}</span>
              </div>
              {metrics.isLoading ? (
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              ) : (
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {stat.value !== undefined ? (typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value) : "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
