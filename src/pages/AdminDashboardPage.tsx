import { useEffect, useState } from "react";
import {
  Users,
  BookOpen,
  DollarSign,
  GraduationCap,
  Sparkles,
  MessageSquare,
  Percent,
  FileText,
  UserPlus,
  Award,
  ChevronRight,
  X,
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
import { motion, AnimatePresence } from "framer-motion";
import { GsapReveal } from "@/components/motion/gsap-reveal";

// Helper for animating numbers
function AnimatedCounter({ value, prefix = "", suffix = "", duration = 1200 }: Readonly<{ value: number; prefix?: string; suffix?: string; duration?: number }>) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  // Handle decimals or large numbers nicely
  const displayVal = prefix === "₹" 
    ? (count / 100).toFixed(2) 
    : count.toLocaleString();

  return <span>{prefix}{displayVal}{suffix}</span>;
}

const mockActivityData = [
  { id: 1, type: "student", message: "Aarav Mehta enrolled in Full Stack Web Development", time: "5 mins ago", tag: "CRM" },
  { id: 2, type: "course", message: "New course 'AI-Powered Data Analytics' published successfully", time: "1 hour ago", tag: "Academics" },
  { id: 3, type: "mentor", message: "Dr. Anjali Deshmukh approved for Cloud Computing AWS Track", time: "3 hours ago", tag: "Mentors" },
  { id: 4, type: "placement", message: "Priya Sharma placed at Deloitte with 12.4 LPA package", time: "5 hours ago", tag: "Placements" },
  { id: 5, type: "lead", message: "High-intent lead received via counselling form (Karan Malhotra)", time: "8 hours ago", tag: "CRM" },
  { id: 6, type: "placement", message: "New hiring agreement signed with Cognizant (25 annual slots)", time: "1 day ago", tag: "Placements" },
];

export default function AdminDashboardPage() {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "12m">("30d");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Dynamic metrics based on timeframe selection
  const metrics = {
    "7d": [
      { label: "Total Students", value: 14210, trend: "+2.4%", isPositive: true, icon: Users, suffix: "", prefix: "" },
      { label: "Active Students", value: 8120, trend: "+4.1%", isPositive: true, icon: GraduationCap, suffix: "", prefix: "" },
      { label: "Total Courses", value: 12, trend: "0%", isPositive: true, icon: BookOpen, suffix: "", prefix: "" },
      { label: "Total Revenue", value: 17800, trend: "+1.2%", isPositive: true, icon: DollarSign, suffix: " Cr", prefix: "₹" },
      { label: "Placement Rate", value: 95, trend: "+0.2%", isPositive: true, icon: Award, suffix: "%", prefix: "" },
      { label: "Total Mentors", value: 15, trend: "+1 new", isPositive: true, icon: Sparkles, suffix: "", prefix: "" },
      { label: "Leads Generated", value: 920, trend: "+15%", isPositive: true, icon: MessageSquare, suffix: "", prefix: "" },
      { label: "Conversion Rate", value: 17, trend: "-0.5%", isPositive: false, icon: Percent, suffix: "%", prefix: "" },
    ],
    "30d": [
      { label: "Total Students", value: 14820, trend: "+5.8%", isPositive: true, icon: Users, suffix: "", prefix: "" },
      { label: "Active Students", value: 8410, trend: "+8.3%", isPositive: true, icon: GraduationCap, suffix: "", prefix: "" },
      { label: "Total Courses", value: 12, trend: "+2 new", isPositive: true, icon: BookOpen, suffix: "", prefix: "" },
      { label: "Total Revenue", value: 18400, trend: "+12.4%", isPositive: true, icon: DollarSign, suffix: " Cr", prefix: "₹" },
      { label: "Placement Rate", value: 95, trend: "+0.5%", isPositive: true, icon: Award, suffix: "%", prefix: "" },
      { label: "Total Mentors", value: 15, trend: "+2 new", isPositive: true, icon: Sparkles, suffix: "", prefix: "" },
      { label: "Leads Generated", value: 4120, trend: "+28%", isPositive: true, icon: MessageSquare, suffix: "", prefix: "" },
      { label: "Conversion Rate", value: 18, trend: "+1.8%", isPositive: true, icon: Percent, suffix: "%", prefix: "" },
    ],
    "12m": [
      { label: "Total Students", value: 16800, trend: "+34.2%", isPositive: true, icon: Users, suffix: "", prefix: "" },
      { label: "Active Students", value: 9800, trend: "+42.5%", isPositive: true, icon: GraduationCap, suffix: "", prefix: "" },
      { label: "Total Courses", value: 12, trend: "+4 new", isPositive: true, icon: BookOpen, suffix: "", prefix: "" },
      { label: "Total Revenue", value: 21200, trend: "+44.1%", isPositive: true, icon: DollarSign, suffix: " Cr", prefix: "₹" },
      { label: "Placement Rate", value: 96, trend: "+1.8%", isPositive: true, icon: Award, suffix: "%", prefix: "" },
      { label: "Total Mentors", value: 16, trend: "+3 new", isPositive: true, icon: Sparkles, suffix: "", prefix: "" },
      { label: "Leads Generated", value: 18450, trend: "+112%", isPositive: true, icon: MessageSquare, suffix: "", prefix: "" },
      { label: "Conversion Rate", value: 19, trend: "+2.4%", isPositive: true, icon: Percent, suffix: "%", prefix: "" },
    ],
  }[timeframe];

  // Dynamic Chart Data based on timeframe
  const chartData = {
    "7d": [
      { name: "Mon", revenue: 24, enrollments: 45, placementRate: 94 },
      { name: "Tue", revenue: 28, enrollments: 52, placementRate: 94 },
      { name: "Wed", revenue: 35, enrollments: 68, placementRate: 95 },
      { name: "Thu", revenue: 30, enrollments: 60, placementRate: 95 },
      { name: "Fri", revenue: 42, enrollments: 85, placementRate: 95 },
      { name: "Sat", revenue: 48, enrollments: 95, placementRate: 95 },
      { name: "Sun", revenue: 54, enrollments: 110, placementRate: 96 },
    ],
    "30d": [
      { name: "Week 1", revenue: 120, enrollments: 340, placementRate: 94.2 },
      { name: "Week 2", revenue: 145, enrollments: 420, placementRate: 94.8 },
      { name: "Week 3", revenue: 168, enrollments: 510, placementRate: 95.1 },
      { name: "Week 4", revenue: 184, enrollments: 580, placementRate: 95.4 },
    ],
    "12m": [
      { name: "Jan", revenue: 110, enrollments: 920, placementRate: 93.8 },
      { name: "Feb", revenue: 125, enrollments: 1050, placementRate: 94.0 },
      { name: "Mar", revenue: 132, enrollments: 1100, placementRate: 94.2 },
      { name: "Apr", revenue: 145, enrollments: 1240, placementRate: 94.5 },
      { name: "May", revenue: 150, enrollments: 1300, placementRate: 94.8 },
      { name: "Jun", revenue: 162, enrollments: 1420, placementRate: 95.0 },
      { name: "Jul", revenue: 170, enrollments: 1480, placementRate: 95.2 },
      { name: "Aug", revenue: 175, enrollments: 1520, placementRate: 95.3 },
      { name: "Sep", revenue: 180, enrollments: 1590, placementRate: 95.4 },
      { name: "Oct", revenue: 184, enrollments: 1640, placementRate: 95.4 },
      { name: "Nov", revenue: 195, enrollments: 1780, placementRate: 95.8 },
      { name: "Dec", revenue: 212, enrollments: 1950, placementRate: 96.0 },
    ],
  }[timeframe];

  const handleQuickAction = (action: string) => {
    setActiveModal(action);
  };

  const submitAction = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveModal(null);
    toast.success("Action logged successfully. Operational record updated in state.");
  };

  const filteredActivities = activityFilter === "all"
    ? mockActivityData
    : mockActivityData.filter(act => act.tag.toLowerCase() === activityFilter.toLowerCase());

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Timeframe Header */}
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F2B7A] dark:text-cyan-200">
            Operations Command Center
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Real-time analytics, course updates, and placements tracking across campuses.
          </p>
        </div>

        {/* Timeframe selector pill */}
        <div className="flex h-11 items-center rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800">
          {[
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" },
            { id: "12m", label: "12 Months" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTimeframe(item.id as "7d" | "30d" | "12m");
                toast.success(`Dashboard re-calculated for Last ${item.label}`);
              }}
              className={[
                "h-9 rounded-lg px-4 text-xs font-black transition-all",
                timeframe === item.id
                  ? "bg-white text-[#0F2B7A] shadow-sm dark:bg-[#0F2B7A] dark:text-white"
                  : "text-[#64748B] hover:text-[#0F2B7A] dark:text-[#94A3B8] dark:hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </GsapReveal>

      {/* KPI Stats Cards Grid */}
      <GsapReveal direction="up" delay={0.1} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              whileHover={{ y: -4, scale: 1.01 }}
              className="premium-stat-card relative overflow-hidden rounded-[20px] border border-[#DDE7F6] bg-white p-5 shadow-[0_8px_30px_rgb(15,43,122,0.03)] transition-all dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  {card.label}
                </span>
                <span className="rounded-lg bg-[#EEF3FA] p-2 text-[#0F2B7A] dark:bg-slate-800 dark:text-cyan-300">
                  <Icon className="size-4" />
                </span>
              </div>

              <div className="mt-4">
                <span className="text-2xl font-black text-[#0F2B7A] dark:text-white">
                  <AnimatedCounter
                    value={card.value}
                    prefix={card.prefix}
                    suffix={card.suffix}
                  />
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold">
                <span className={card.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                  {card.isPositive ? "+" : ""}{card.trend}
                </span>
                <span className="text-slate-400 dark:text-slate-500">vs last period</span>
              </div>
            </motion.div>
          );
        })}
      </GsapReveal>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Growth Area Chart */}
        <GsapReveal direction="up" delay={0.2} className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-[#0F2B7A] dark:text-cyan-200">Revenue & Enrollment Growth</h3>
              <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">Cohort value tracking across programs</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-[#0F2B7A]" />
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Revenue (Lakhs)</span>
              <span className="ml-3 inline-block size-3 rounded-full bg-[#22D3EE]" />
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">Enrollments</span>
            </div>
          </div>

          <div className="mt-8 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F2B7A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0F2B7A" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorEnr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0F2B7A", color: "#fff", borderRadius: 12, border: "none" }}
                  labelClassName="font-black text-cyan-200"
                />
                <Area type="monotone" dataKey="revenue" name="Revenue (Lakhs)" stroke="#0F2B7A" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="enrollments" name="Enrollments" stroke="#22D3EE" fillOpacity={1} fill="url(#colorEnr)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GsapReveal>

        {/* Placement Rate Side Chart */}
        <GsapReveal direction="up" delay={0.25} className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <div>
            <h3 className="text-lg font-black text-[#0F2B7A] dark:text-cyan-200">Placement Efficiency</h3>
            <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">Monthly job outcomes guarantee rate</p>
          </div>

          <div className="mt-8 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 100]} stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: 12, border: "none" }}
                  labelClassName="font-black text-cyan-400"
                />
                <Bar dataKey="placementRate" name="Placement Rate (%)" fill="#22D3EE" radius={[8, 8, 0, 0]}>
                  {chartData.map((_entry, index) => (
                    <span key={`cell-${index}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GsapReveal>
      </div>

      {/* Activities Feed and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Timeline Activities Feed */}
        <GsapReveal direction="up" delay={0.3} className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-[#0F2B7A] dark:text-cyan-200">Live Operation Stream</h3>
              <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">Real-time system actions audit</p>
            </div>
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1">
              {["all", "CRM", "Academics", "Placements"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActivityFilter(tag)}
                  className={[
                    "rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all",
                    activityFilter === tag
                      ? "bg-[#0F2B7A] text-white dark:bg-cyan-400 dark:text-[#0F2B7A]"
                      : "bg-[#EEF3FA] text-[#64748B] hover:bg-slate-200 dark:bg-slate-800 dark:text-[#94A3B8] dark:hover:bg-slate-700",
                  ].join(" ")}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological list container */}
          <div className="mt-6 space-y-4">
            {filteredActivities.length === 0 ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">No actions found matching category</p>
            ) : (
              filteredActivities.map((act) => (
                <div key={act.id} className="group relative flex items-start gap-4 rounded-xl border border-transparent p-3.5 transition-all hover:border-[#DDE7F6] hover:bg-[#EEF3FA]/30 dark:hover:border-slate-800 dark:hover:bg-slate-800/20">
                  <div className="mt-1 flex size-2.5 shrink-0 rounded-full bg-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-black text-[#0F2B7A] dark:text-slate-200">
                      {act.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400">{act.time}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#64748B] dark:bg-slate-800 dark:text-[#94A3B8]">
                        {act.tag}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
                </div>
              ))
            )}
          </div>
        </GsapReveal>

        {/* Quick Operations Console */}
        <GsapReveal direction="up" delay={0.35} className="rounded-2xl border border-[#DDE7F6] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div>
            <h3 className="text-lg font-black text-[#0F2B7A] dark:text-cyan-200">Quick Actions Command</h3>
            <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">Deploy system records dynamically</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { id: "add-course", title: "Add New Course", desc: "Academics Curriculum Editor", icon: BookOpen, color: "from-blue-500 to-indigo-600" },
              { id: "add-mentor", title: "Add New Mentor", desc: "Endorse professional profiles", icon: UserPlus, color: "from-cyan-500 to-blue-600" },
              { id: "add-story", title: "Add Placement Story", desc: "Update student success archive", icon: Award, color: "from-emerald-500 to-teal-600" },
              { id: "gen-report", title: "Generate Report", desc: "Export full operational excel", icon: FileText, color: "from-amber-500 to-orange-600" },
            ].map((btn) => {
              const ActionIcon = btn.icon;
              return (
                <button
                  key={btn.id}
                  onClick={() => handleQuickAction(btn.id)}
                  className="flex flex-col text-left rounded-2xl border border-[#DDE7F6] p-4 transition-all hover:-translate-y-1 hover:border-[#0F2B7A]/30 hover:shadow-lg hover:shadow-[#0f2b7a]/5 dark:border-slate-800 dark:hover:border-slate-700"
                >
                  <span className={`inline-grid size-9 place-items-center rounded-xl bg-gradient-to-br ${btn.color} text-white`}>
                    <ActionIcon className="size-4" />
                  </span>
                  <span className="mt-4 text-xs font-black text-[#0F2B7A] dark:text-white">{btn.title}</span>
                  <span className="mt-1 text-[10px] font-bold text-slate-400 leading-normal">{btn.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-[#DDE7F6] bg-[#F8FAFC] p-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-black text-[#0F2B7A] dark:text-cyan-300">Supabase Connection State</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400 leading-normal">
              Schema models mapped. Production databases can be plugged seamlessly.
            </p>
          </div>
        </GsapReveal>
      </div>

      {/* Command Modals Dialogs Container */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#020617]/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-[#DDE7F6] bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="text-lg font-black text-[#0F2B7A] dark:text-white capitalize">
                  {activeModal.replaceAll("-", " ")}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={submitAction} className="mt-6 space-y-4">
                {activeModal === "add-course" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Course Name</label>
                      <input required className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" placeholder="e.g. Next.js SaaS Architecture" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Category</label>
                        <select className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                          <option>Full Stack Development</option>
                          <option>Data Science & AI</option>
                          <option>UI/UX Design</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Price (INR)</label>
                        <input type="number" required className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" placeholder="39999" />
                      </div>
                    </div>
                  </>
                )}

                {activeModal === "add-mentor" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Mentor Full Name</label>
                      <input required className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" placeholder="e.g. Dr. Pooja Deshmukh" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Role / Company</label>
                      <input required className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" placeholder="e.g. Principal Architect at Amazon" />
                    </div>
                  </>
                )}

                {activeModal === "add-story" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Student Name</label>
                      <input required className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" placeholder="e.g. Sameer Sen" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Company</label>
                        <input required className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" placeholder="e.g. Deloitte" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Package (LPA)</label>
                        <input type="number" step="0.1" required className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" placeholder="12.5" />
                      </div>
                    </div>
                  </>
                )}

                {activeModal === "gen-report" && (
                  <>
                    <div className="space-y-2 rounded-2xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                      <p className="text-xs font-black">Export Variables Notice</p>
                      <p className="text-[10px] font-bold leading-normal">
                        Generating comprehensive CSV/Excel bundle requires processing 14k student registers, 4k counseling calls, and placement timeline logs.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#0F2B7A] dark:text-slate-300">Export Scope</label>
                      <select className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                        <option>Full Platform Audit Log</option>
                        <option>Revenue & Transactions Ledger</option>
                        <option>Placement Story Records</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-11 rounded-xl px-5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-[#0F2B7A] px-6 text-xs font-black text-white hover:bg-opacity-90 shadow-lg shadow-[#0f2b7a]/20 dark:bg-cyan-400 dark:text-[#0F2B7A] dark:shadow-none"
                  >
                    Log Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
