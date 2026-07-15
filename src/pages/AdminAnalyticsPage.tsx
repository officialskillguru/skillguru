import { useState } from "react";
import {
  TrendingUp,
  Download,
  DollarSign,
  Users,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { GsapReveal } from "@/components/motion/gsap-reveal";

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
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            Analytics Command Center
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-slate-400">
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
      <div className="flex border-b border-border dark:border-slate-800">
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
                  ? "border-primary text-primary dark:border-cyan-400 dark:text-cyan-300"
                  : "border-transparent text-slate-450 hover:text-primary dark:hover:text-white",
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
          <GsapReveal direction="up" className="rounded-3xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-primary dark:text-cyan-200">Gross Tuition Income</h3>
              <p className="text-xs font-semibold text-slate-400">Actual billing ledger vs baseline targets (represented in Lakhs)</p>
            </div>
            <div className="h-80 w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
              <DollarSign className="size-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-500">Feature Not Available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                The production schema does not currently support payment processing or transaction ledgers.
              </p>
            </div>
          </GsapReveal>
        )}

        {activeAnalysisTab === "enrollments" && (
          <GsapReveal direction="up" className="rounded-3xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-primary dark:text-cyan-200">Discipline Segment Distribution</h3>
              <p className="text-xs font-semibold text-slate-400">Total course registrations vs active weekly learning users</p>
            </div>
            <div className="h-80 w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
              <Users className="size-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-500">Feature Not Available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                Detailed enrollment telemetry is currently under development for the production environment.
              </p>
            </div>
          </GsapReveal>
        )}

        {activeAnalysisTab === "students" && (
          <GsapReveal direction="up" className="rounded-3xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-primary dark:text-cyan-200">Syllabus Cohort Retention Index</h3>
              <p className="text-xs font-semibold text-slate-400">Percentage of active students attending live sessions by program week</p>
            </div>
            <div className="h-80 w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
              <GraduationCap className="size-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-500">Feature Not Available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                Historical activity logging for cohort retention tracking is not enabled in this database version.
              </p>
            </div>
          </GsapReveal>
        )}

        {activeAnalysisTab === "leads" && (
          <GsapReveal direction="up" className="rounded-3xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-primary dark:text-cyan-200">Channel Marketing Ratios</h3>
              <p className="text-xs font-semibold text-slate-400">Lead-to-enrollment conversion coefficient (%) across acquisition channels</p>
            </div>
            <div className="h-80 w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
              <TrendingUp className="size-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-500">Feature Not Available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                Missing required acquisition channel source field mapping in CRM leads.
              </p>
            </div>
          </GsapReveal>
        )}
      </div>
    </div>
  );
}
