import { useState } from "react";
import { Download, Briefcase, TrendingUp, Search, Building2 } from "lucide-react";
import { toast } from "sonner";
import { GsapReveal } from "@/components/motion/gsap-reveal";

export default function AdminPlacementsPage() {
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"salaries" | "partners" | "hiring">("salaries");
  const [search, _setSearch] = useState("");

  const handleExport = () => {
    toast.success("Placement records spreadsheet compiled. Excel download initiated.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-cyan-200">
            Placement & Corporate Success
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-slate-400">
            Salary distributions, corporate hiring partners, and candidate conversion pipelines.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        >
          <Download className="size-4" />
          <span>Export Summary Report</span>
        </button>
      </GsapReveal>

      {/* Stats Summary / Empty State placeholders */}
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Active Hiring Partners", value: "--", desc: "Awaiting database support", icon: Building2 },
          { label: "Avg Placement Package", value: "--", desc: "Awaiting database support", icon: TrendingUp },
          { label: "Success Rate", value: "--", desc: "Awaiting database support", icon: Briefcase },
        ].map((s, idx) => (
          <GsapReveal key={idx} direction="up" delay={idx * 0.1}>
            <div className="flex flex-col rounded-3xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-800">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground dark:text-slate-400">{s.label}</p>
                  <h3 className="text-2xl font-black tracking-tight text-primary dark:text-cyan-200">{s.value}</h3>
                  <p className="text-[10px] font-bold text-slate-400">{s.desc}</p>
                </div>
              </div>
            </div>
          </GsapReveal>
        ))}
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-border dark:border-slate-800">
        {[
          { id: "salaries", label: "Salary Brackets", icon: TrendingUp },
          { id: "partners", label: "Partner Index", icon: Building2 },
          { id: "hiring", label: "Hiring Velocity", icon: Briefcase }
        ].map((tb) => {
          const TabIcon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveAnalysisTab(tb.id as "salaries" | "partners" | "hiring")}
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

      {/* Dynamic Placements Dashboards */}
      <div className="grid gap-6">
        <GsapReveal direction="up" className="rounded-3xl border border-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-primary dark:text-cyan-200 capitalize">{activeAnalysisTab} Analytics</h3>
              <p className="text-xs font-semibold text-slate-400">Aggregated placement and hiring metadata</p>
            </div>
            {activeAnalysisTab === "partners" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search partner..."
                  value={search}
                  disabled
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white opacity-50 cursor-not-allowed"
                />
              </div>
            )}
          </div>
          
          <div className="h-80 w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
            <Briefcase className="size-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-slate-500">Feature Not Available</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
              The production schema does not currently support a `placements` or `hiring_partners` table. Data tracking is disabled.
            </p>
          </div>
        </GsapReveal>
      </div>
    </div>
  );
}
