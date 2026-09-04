import {
  GraduationCap,
  Users,
  BookOpen,
  TrendingUp,
  ShoppingCart,
  Award,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useAdminData";

export function DashboardStats() {
  const { metrics } = useDashboardData();
  const data = metrics.data;

  const stats = [
    {
      id: "students",
      label: "Total Students",
      value: data?.totalStudents,
      icon: GraduationCap,
      newThisMonth: data?.newThisMonth.students,
    },
    {
      id: "mentors",
      label: "Total Teachers",
      value: data?.totalMentors,
      icon: Users,
      newThisMonth: data?.newThisMonth.mentors,
    },
    {
      id: "courses",
      label: "Total Courses",
      value: data?.totalCourses,
      icon: BookOpen,
      newThisMonth: data?.newThisMonth.courses,
    },
    {
      id: "revenue",
      label: "Total Revenue",
      value: data ? `₹${(data.totalRevenue / 100).toLocaleString("en-IN")}` : undefined,
      icon: TrendingUp,
      newThisMonth: data ? `₹${(data.newThisMonth.revenue / 100).toLocaleString("en-IN")}` : undefined,
    },
    {
      id: "orders",
      label: "Total Orders",
      value: data?.totalOrders,
      icon: ShoppingCart,
      newThisMonth: data?.newThisMonth.orders,
    },
    {
      id: "certificates",
      label: "Certificates Issued",
      value: data?.certificatesIssued,
      icon: Award,
      newThisMonth: data?.newThisMonth.certificates,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className="group flex flex-col justify-between rounded-xl border border-border bg-gradient-to-b from-card to-card/60 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                {metrics.isLoading ? (
                  <div className="mt-1.5 h-6 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="text-xl font-black text-foreground mt-1 tabular-nums">
                    {stat.value !== undefined ? (typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value) : "—"}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
              {metrics.isLoading ? (
                <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
              ) : (
                <span className="text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  +{stat.newThisMonth ?? 0}
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">This Month</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
