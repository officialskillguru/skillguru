import { useState } from "react";
import {
  TrendingUp, Download, DollarSign, Users, GraduationCap,
  ArrowUpRight, ArrowDownRight, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/mentor-invite.service";
import { paymentService } from "@/services/payment.service";
import { exportToCSV } from "@/utils/export";
import { GsapReveal } from "@/components/motion/gsap-reveal";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

function StatCard({
  label, value, sub, trend, color
}: { label: string; value: string; sub: string; trend?: number; color: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {trend !== undefined && (
          trend >= 0
            ? <ArrowUpRight className="size-3.5 text-emerald-500" />
            : <ArrowDownRight className="size-3.5 text-red-500" />
        )}
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"revenue" | "enrollments" | "students" | "leads">("revenue");

  const { data: revenueMetrics, isLoading: loadingRevenue } = useQuery({
    queryKey: ["analytics", "revenue-metrics"],
    queryFn: async () => {
      const r = await paymentService.getRevenueMetrics();
      if (!r.success) throw r.error;
      return r.data;
    },
  });

  const { data: revenueChart = [] } = useQuery({
    queryKey: ["analytics", "revenue-chart"],
    queryFn: async () => {
      const r = await analyticsService.getRevenueChart(12);
      if (!r.success) return [];
      return r.data;
    },
  });

  const { data: enrollmentChart = [] } = useQuery({
    queryKey: ["analytics", "enrollment-chart"],
    queryFn: async () => {
      const r = await analyticsService.getEnrollmentChart(12);
      if (!r.success) return [];
      return r.data;
    },
  });

  const { data: studentGrowth = [] } = useQuery({
    queryKey: ["analytics", "student-growth"],
    queryFn: async () => {
      const r = await analyticsService.getStudentGrowth(12);
      if (!r.success) return [];
      return r.data;
    },
  });

  const { data: leadConversion = [], refetch: refetchLeads } = useQuery({
    queryKey: ["analytics", "lead-conversion"],
    queryFn: async () => {
      const r = await analyticsService.getLeadConversionChart();
      if (!r.success) return [];
      return r.data;
    },
  });

  const { data: topCourses = [] } = useQuery({
    queryKey: ["analytics", "top-courses"],
    queryFn: async () => {
      const r = await analyticsService.getTopCourses(8);
      if (!r.success) return [];
      return r.data;
    },
  });

  const handleExport = () => {
    if (activeTab === "revenue") exportToCSV(revenueChart as unknown as Record<string, unknown>[], "revenue_analytics");
    else if (activeTab === "enrollments") exportToCSV(enrollmentChart as unknown as Record<string, unknown>[], "enrollment_analytics");
    else if (activeTab === "students") exportToCSV(studentGrowth, "student_growth");
    else exportToCSV(leadConversion, "lead_conversion");
  };

  const tabs = [
    { id: "revenue",     label: "Revenue",     icon: DollarSign },
    { id: "enrollments", label: "Enrollments",  icon: Users },
    { id: "students",    label: "Student Growth",icon: GraduationCap },
    { id: "leads",       label: "CRM Funnel",   icon: TrendingUp },
  ] as const;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            Analytics Command Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live data from your Supabase database — revenue, enrollments, students, and CRM conversions.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-xs font-black text-foreground hover:bg-muted"
        >
          <Download className="size-4" /> Export CSV
        </button>
      </GsapReveal>

      {/* KPI Cards */}
      {!loadingRevenue && revenueMetrics && (
        <GsapReveal direction="up" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Revenue"
            value={`₹${(revenueMetrics.totalRevenue / 100).toLocaleString("en-IN")}`}
            sub="All-time successful payments"
            trend={1}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="This Month"
            value={`₹${(revenueMetrics.thisMonthRevenue / 100).toLocaleString("en-IN")}`}
            sub="Current month revenue"
            trend={1}
            color="text-primary"
          />
          <StatCard
            label="Success Rate"
            value={
              revenueMetrics.totalPayments > 0
                ? `${Math.round((revenueMetrics.successfulPayments / revenueMetrics.totalPayments) * 100)}%`
                : "—"
            }
            sub={`${revenueMetrics.successfulPayments} of ${revenueMetrics.totalPayments} payments`}
            color="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Total Refunds"
            value={`₹${(revenueMetrics.totalRefunds / 100).toLocaleString("en-IN")}`}
            sub="Processed refunds"
            trend={-1}
            color="text-red-500"
          />
        </GsapReveal>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-border dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-black transition-all",
                activeTab === tab.id
                  ? "border-primary text-primary dark:border-cyan-400 dark:text-cyan-300"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Revenue Tab */}
      {activeTab === "revenue" && (
        <GsapReveal direction="up" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-1 text-base font-black text-foreground">Monthly Revenue vs Refunds</h3>
            <p className="mb-6 text-xs text-muted-foreground">Revenue collected vs refunds issued per month</p>
            {revenueChart.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No payment data yet. Revenue will appear here once payments are processed.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 100).toLocaleString("en-IN")}`} />
                  <Tooltip formatter={(v: unknown) => `₹${(Number(v) / 100).toLocaleString("en-IN")}`} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rev)" name="Revenue" />
                  <Area type="monotone" dataKey="refunds" stroke="#ef4444" fill="none" name="Refunds" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Top courses table */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-base font-black text-foreground">Top Performing Courses</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Course</th>
                    <th className="pb-3 pr-4">Enrollments</th>
                    <th className="pb-3 pr-4">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topCourses.map((c) => (
                    <tr key={c.id} className="py-3">
                      <td className="py-3 pr-4 font-semibold">{c.title}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{c.enrollments}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${c.completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{c.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {topCourses.length === 0 && (
                    <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No course data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </GsapReveal>
      )}

      {/* Enrollments Tab */}
      {activeTab === "enrollments" && (
        <GsapReveal direction="up" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-1 text-base font-black text-foreground">Enrollment Trends</h3>
          <p className="mb-6 text-xs text-muted-foreground">Monthly new enrollments vs completions</p>
          {enrollmentChart.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No enrollment data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={enrollmentChart}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="enrollments" fill="#6366f1" name="New Enrollments" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completions" fill="#10b981" name="Completions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GsapReveal>
      )}

      {/* Student Growth Tab */}
      {activeTab === "students" && (
        <GsapReveal direction="up" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-1 text-base font-black text-foreground">Student Growth</h3>
          <p className="mb-6 text-xs text-muted-foreground">New registrations and cumulative student base</p>
          {studentGrowth.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No student data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={studentGrowth}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="students" stroke="#6366f1" name="New Students" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#10b981" name="Total Students" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GsapReveal>
      )}

      {/* CRM Funnel Tab */}
      {activeTab === "leads" && (
        <GsapReveal direction="up" className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-foreground">Lead Status Distribution</h3>
                <p className="text-xs text-muted-foreground">CRM funnel breakdown</p>
              </div>
              <button
                onClick={() => void refetchLeads()}
                className="rounded-lg p-2 hover:bg-muted"
                title="Refresh"
              >
                <RefreshCw className="size-4 text-muted-foreground" />
              </button>
            </div>
            {leadConversion.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No leads data yet. Add leads in the CRM module.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leadConversion}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ""} (${Math.round((percent ?? 0) * 100)}%)`
                    }
                    labelLine={false}
                  >
                    {leadConversion.map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown, name: unknown) => [String(v), String(name)] as [string, string]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-base font-black text-foreground">Lead Status Breakdown</h3>
            <div className="space-y-3">
              {leadConversion.map((item: { status: string; count: number; percentage: number }, i: number) => (
                <div key={item.status} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 text-sm font-semibold capitalize">{item.status.replace("_", " ")}</span>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                  <span className="w-12 text-right text-xs font-black text-primary">{item.percentage}%</span>
                </div>
              ))}
              {leadConversion.length === 0 && (
                <p className="text-sm text-muted-foreground">No leads to display.</p>
              )}
            </div>
          </div>
        </GsapReveal>
      )}
    </div>
  );
}
