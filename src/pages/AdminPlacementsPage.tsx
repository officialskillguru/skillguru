import { useState } from "react";
import {
  Award,
  Building2,
  DollarSign,
  Download,
  Users,
  Search,
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
} from "recharts";
import { toast } from "sonner";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { recruiterLogos } from "@/data/platform";

// Mock salary bracket distributions
const salaryBracketData = [
  { bracket: "3-5 LPA", students: 380 },
  { bracket: "5-8 LPA", students: 510 },
  { bracket: "8-12 LPA", students: 295 },
  { bracket: "12-18 LPA", students: 140 },
  { bracket: "18+ LPA", students: 45 },
];

const placementTrendData = [
  { name: "Jan", hires: 42, partners: 12 },
  { name: "Feb", hires: 55, partners: 14 },
  { name: "Mar", hires: 68, partners: 15 },
  { name: "Apr", hires: 85, partners: 18 },
  { name: "May", hires: 92, partners: 22 },
  { name: "Jun", hires: 110, partners: 25 },
];

const partnerHiringData = [
  { name: "TCS", sector: "IT Services", hires: 124, status: "High Volume", logo: recruiterLogos.TCS },
  { name: "Infosys", sector: "IT Services", hires: 98, status: "Active", logo: recruiterLogos.Infosys },
  { name: "Deloitte", sector: "Consulting", hires: 75, status: "Elite Partner", logo: recruiterLogos.Deloitte },
  { name: "Accenture", sector: "IT Services & Consulting", hires: 64, status: "Active", logo: recruiterLogos.Accenture },
  { name: "Capgemini", sector: "IT Services", hires: 48, status: "Active", logo: recruiterLogos.Capgemini },
];

export default function AdminPlacementsPage() {
  const [sectorFilter, _setSectorFilter] = useState("All");
  const [search, setSearch] = useState("");

  const handleExport = () => {
    toast.success("Placement records spreadsheet compiled. Excel download initiated.");
  };

  const filteredPartners = partnerHiringData.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesSector = sectorFilter === "All" || p.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111E79] dark:text-cyan-200">
            Corporate Placements Command
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Review hiring partner engagement rates, candidate interview pipelines, salary distributions and monthly career transitions.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        >
          <Download className="size-4" />
          <span>Export Ledger</span>
        </button>
      </GsapReveal>

      {/* KPI Stats */}
      <GsapReveal direction="up" delay={0.1} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Placed Students", count: "1,420+", desc: "Total graduates placed", icon: Users },
          { label: "Placement Rate", count: "95.4%", desc: "Average guarantee index", icon: Award },
          { label: "Highest Package", count: "24.0 LPA", desc: "Top tech candidate tier", icon: DollarSign },
          { label: "Average Package", count: "8.5 LPA", desc: "Median salary baseline", icon: DollarSign },
          { label: "Hiring Partners", count: "150+", desc: "Active tech recruiters", icon: Building2 },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#DDE7F6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {card.label}
                </span>
                <span className="rounded-lg bg-[#EEF3FA] p-1.5 text-[#111E79] dark:bg-slate-800 dark:text-cyan-300">
                  <Icon className="size-3.5" />
                </span>
              </div>
              <p className="mt-3 text-xl font-black text-[#111E79] dark:text-white">{card.count}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-400">{card.desc}</p>
            </div>
          );
        })}
      </GsapReveal>

      {/* Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Monthly Hire Trends */}
        <GsapReveal direction="up" delay={0.2} className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div>
            <h3 className="text-base font-black text-[#111E79] dark:text-cyan-200">Hiring Intensity Index</h3>
            <p className="text-xs font-semibold text-slate-400">Hires and active recruiters month-over-month</p>
          </div>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={placementTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hiresGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111E79" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#111E79" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111E79", color: "#fff", borderRadius: 12 }} />
                <Area type="monotone" dataKey="hires" name="Students Placed" stroke="#111E79" fill="url(#hiresGrad)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GsapReveal>

        {/* Salary distribution histogram */}
        <GsapReveal direction="up" delay={0.25} className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div>
            <h3 className="text-base font-black text-[#111E79] dark:text-cyan-200">LPA Salary Distribution</h3>
            <p className="text-xs font-semibold text-slate-400">Total placed student counts by salary bracket</p>
          </div>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salaryBracketData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="bracket" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: 12 }} />
                <Bar dataKey="students" name="Students" fill="#22D3EE" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GsapReveal>
      </div>

      {/* Recruiter Partners Directory */}
      <GsapReveal direction="up" delay={0.3} className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black text-[#111E79] dark:text-cyan-200">Active Recruiting Partners</h3>
            <p className="text-xs font-semibold text-slate-400">Verify corporate accounts and placement ledgers</p>
          </div>

          {/* Search bar inside directory */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recruiter..."
                className="h-9 w-48 rounded-lg border border-slate-200 pl-8 pr-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Partners grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {filteredPartners.map((rec) => (
            <div key={rec.name} className="flex flex-col justify-between rounded-2xl border border-slate-100 p-4 hover:border-[#111E79]/20 hover:bg-[#EEF3FA]/10 dark:border-slate-850 dark:hover:bg-slate-850/10">
              <div className="flex items-center justify-between">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {rec.sector}
                </span>
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              </div>

              {/* Logo representation */}
              <div className="my-5 grid h-10 place-items-center">
                {rec.logo ? (
                  <img src={rec.logo} alt={rec.name} className="max-h-8 object-contain filter saturate-75 opacity-80" />
                ) : (
                  <span className="text-sm font-black text-slate-400">{rec.name}</span>
                )}
              </div>

              <div className="border-t border-slate-50 pt-3 dark:border-slate-850">
                <p className="text-[10px] font-bold text-slate-400">Total Hires</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#111E79] dark:text-white">{rec.hires} Placements</p>
                  <span className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase">{rec.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GsapReveal>
    </div>
  );
}
