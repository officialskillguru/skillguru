import { useState } from "react";
import {
  TrendingUp,
  Download,
  DollarSign,
  Users,
  GraduationCap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { toast } from "sonner";
import { GsapReveal } from "@/components/motion/gsap-reveal";

// Analytical datasets
const revenueData = [
  { month: "Jan", actual: 12.4, target: 10.0 },
  { month: "Feb", actual: 14.5, target: 11.5 },
  { month: "Mar", actual: 16.8, target: 13.0 },
  { month: "Apr", actual: 15.2, target: 14.5 },
  { month: "May", actual: 18.4, target: 16.0 },
  { month: "Jun", actual: 21.2, target: 18.0 },
];

const enrollmentCategoryData = [
  { name: "Development", students: 580, active: 490 },
  { name: "Data Science", students: 420, active: 380 },
  { name: "Cloud", students: 310, active: 240 },
  { name: "UI/UX", students: 295, active: 260 },
];

const cohortRetentionData = [
  { week: "Week 1", retention: 100 },
  { week: "Week 4", retention: 96 },
  { week: "Week 8", retention: 92 },
  { week: "Week 12", retention: 89 },
  { week: "Week 16", retention: 88 },
  { week: "Week 20", retention: 85 },
];

const channelConversionData = [
  { channel: "Google Search", conversion: 22.4 },
  { channel: "Referral", conversion: 35.8 },
  { channel: "LinkedIn", conversion: 18.5 },
  { channel: "Facebook Ads", conversion: 12.2 },
  { channel: "Instagram", conversion: 9.8 },
];

export default function AdminAnalyticsPage() {
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"revenue" | "enrollments" | "students" | "leads">("revenue");

  const handleExportPDF = () => {
    toast.success("Operational quarterly analytical summary exported to PDF.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F2B7A] dark:text-cyan-200">
            Analytics Command Center
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Cohort retention indexes, dynamic billing ledgers, counselor metrics, and channel conversion coefficients.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        >
          <Download className="size-4" />
          <span>Export Summary Report</span>
        </button>
      </GsapReveal>

      {/* Nav Tabs */}
      <div className="flex border-b border-[#DDE7F6] dark:border-slate-800">
        {[
          { id: "revenue", label: "Revenue Analytics", icon: DollarSign },
          { id: "enrollments", label: "Enrollment Trends", icon: Users },
          { id: "students", label: "Cohort Progress", icon: GraduationCap },
          { id: "leads", label: "Conversion Ratios", icon: TrendingUp }
        ].map((tb) => {
          const TabIcon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveAnalysisTab(tb.id as "revenue" | "enrollments" | "students" | "leads")}
              className={[
                "py-3.5 px-5 text-xs font-black border-b-2 transition-all flex items-center gap-2",
                activeAnalysisTab === tb.id
                  ? "border-[#0F2B7A] text-[#0F2B7A] dark:border-cyan-400 dark:text-cyan-300"
                  : "border-transparent text-slate-450 hover:text-[#0F2B7A] dark:hover:text-white",
              ].join(" ")}
            >
              <TabIcon className="size-4" />
              <span>{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Analytics Dashboards */}
      <div className="grid gap-6">
        {activeAnalysisTab === "revenue" && (
          <GsapReveal direction="up" className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200">Gross Tuition Income</h3>
              <p className="text-xs font-semibold text-slate-400">Actual billing ledger vs baseline targets (represented in Lakhs)</p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F2B7A" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0F2B7A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F2B7A", color: "#fff", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="actual" name="Actual Tuition Income" stroke="#0F2B7A" fill="url(#actualGrad)" strokeWidth={3} />
                  <Area type="monotone" dataKey="target" name="Baseline Target" stroke="#22D3EE" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GsapReveal>
        )}

        {activeAnalysisTab === "enrollments" && (
          <GsapReveal direction="up" className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200">Discipline Segment Distribution</h3>
              <p className="text-xs font-semibold text-slate-400">Total course registrations vs active weekly learning users</p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: 12 }} />
                  <Bar dataKey="students" name="Course Registrations" fill="#0F2B7A" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="active" name="Weekly Active Users" fill="#22D3EE" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GsapReveal>
        )}

        {activeAnalysisTab === "students" && (
          <GsapReveal direction="up" className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200">Syllabus Cohort Retention Index</h3>
              <p className="text-xs font-semibold text-slate-400">Percentage of active students attending live sessions by program week</p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cohortRetentionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="week" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis domain={[70, 100]} stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="retention" name="Active Engagement Ratio (%)" stroke="#22D3EE" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GsapReveal>
        )}

        {activeAnalysisTab === "leads" && (
          <GsapReveal direction="up" className="rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-[#0F2B7A] dark:text-cyan-200">Channel Marketing Ratios</h3>
              <p className="text-xs font-semibold text-slate-400">Lead-to-enrollment conversion coefficient (%) across acquisition channels</p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelConversionData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis type="number" domain={[0, 40]} stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis dataKey="channel" type="category" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F2B7A", color: "#fff", borderRadius: 12 }} />
                  <Bar dataKey="conversion" name="Conversion Coefficient (%)" fill="#0F2B7A" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GsapReveal>
        )}
      </div>
    </div>
  );
}
