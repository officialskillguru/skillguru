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
    { id: "students", label: "Total Students", value: data?.totalStudents, icon: GraduationCap },
    { id: "mentors", label: "Total Mentors", value: data?.totalMentors, icon: Users },
    { id: "courses", label: "Total Courses", value: data?.totalCourses, icon: BookOpen },
    { id: "revenue", label: "Total Revenue", value: data ? `₹${(data.totalRevenue / 100).toLocaleString("en-IN")}` : undefined, icon: TrendingUp },
    { id: "orders", label: "Total Orders", value: data?.totalOrders, icon: ShoppingCart },
    { id: "certificates", label: "Certificates Issued", value: data?.certificatesIssued, icon: Award },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                {metrics.isLoading ? (
                  <div className="mt-1.5 h-6 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <h3 className="text-xl font-black text-foreground mt-1 tabular-nums">
                    {stat.value !== undefined ? (typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value) : "—"}
                  </h3>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
