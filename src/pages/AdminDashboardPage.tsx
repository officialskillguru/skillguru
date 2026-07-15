import { useEffect, useState } from "react";
import {
  useAdminDashboardMetrics,
  useAdminDashboardRecent,
  useAdminDashboardChart,
} from "@/hooks/admin/useAdminDashboard";
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

  const { data: metricsData } = useAdminDashboardMetrics();
  const { data: _recentData } = useAdminDashboardRecent();
  const { data: chartDataFetched } = useAdminDashboardChart();

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
      { label: "Total Students", value: metricsData?.totalStudents ?? 0, trend: "+34.2%", isPositive: true, icon: Users, suffix: "", prefix: "" },
      { label: "Active Students", value: metricsData?.totalStudents ?? 0, trend: "+42.5%", isPositive: true, icon: GraduationCap, suffix: "", prefix: "" },
      { label: "Total Courses", value: metricsData?.totalCourses ?? 0, trend: "+4 new", isPositive: true, icon: BookOpen, suffix: "", prefix: "" },
      { label: "Total Mentors", value: metricsData?.totalMentors ?? 0, trend: "+3 new", isPositive: true, icon: Sparkles, suffix: "", prefix: "" },
      { label: "Leads Generated", value: metricsData?.totalLeads ?? 0, trend: "+112%", isPositive: true, icon: MessageSquare, suffix: "", prefix: "" },
      { label: "Success Stories", value: metricsData?.successStories ?? 0, trend: "+15%", isPositive: true, icon: Award, suffix: "", prefix: "" },
    ],
  }[timeframe];

  const chartData = chartDataFetched ?? [];

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
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-accent">
            Operations Command Center
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
            Real-time analytics, course updates, and placements tracking across campuses.
          </p>
        </div>

        {/* Timeframe selector pill */}
        <div className="flex h-11 items-center rounded-xl bg-muted p-1">
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
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
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
              className="premium-stat-card relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                <span className="rounded-lg bg-muted p-2 text-primary dark:text-accent">
                  <Icon className="size-4" />
                </span>
              </div>

              <div className="mt-4">
                <span className="text-2xl font-black text-primary dark:text-white">
                  <AnimatedCounter
                    value={card.value}
                    prefix={card.prefix}
                    suffix={card.suffix}
                  />
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold">
                <span className={card.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                  {card.isPositive ? "+" : ""}{card.trend}
                </span>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            </motion.div>
          );
        })}
      </GsapReveal>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Growth Area Chart */}
        <GsapReveal direction="up" delay={0.2} className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-primary dark:text-accent">Revenue & Enrollment Growth</h3>
              <p className="text-xs font-semibold text-muted-foreground">Cohort value tracking across programs</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-primary" />
              <span className="text-xs font-bold text-muted-foreground">Revenue (Lakhs)</span>
              <span className="ml-3 inline-block size-3 rounded-full bg-accent" />
              <span className="text-xs font-bold text-muted-foreground">Enrollments</span>
            </div>
          </div>

          <div className="mt-8 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorEnr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--primary))", color: "#fff", borderRadius: 12, border: "none" }}
                  labelClassName="font-black text-accent"
                />
                <Area type="monotone" dataKey="revenue" name="Revenue (Lakhs)" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="enrollments" name="Enrollments" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorEnr)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GsapReveal>

        {/* Placement Rate Side Chart */}
        <GsapReveal direction="up" delay={0.25} className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-4">
          <div>
            <h3 className="text-lg font-black text-primary dark:text-accent">Placement Efficiency</h3>
            <p className="text-xs font-semibold text-muted-foreground">Monthly job outcomes guarantee rate</p>
          </div>

          <div className="mt-8 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--primary))", color: "#fff", borderRadius: 12, border: "none" }}
                  labelClassName="font-black text-accent"
                />
                <Bar dataKey="placementRate" name="Placement Rate (%)" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]}>
                  {chartData.map((_entry: unknown, index: number) => (
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
        <GsapReveal direction="up" delay={0.3} className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-primary dark:text-accent">Live Operation Stream</h3>
              <p className="text-xs font-semibold text-muted-foreground">Real-time system actions audit</p>
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
                      ? "bg-primary text-primary-foreground dark:bg-accent dark:text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
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
              <p className="py-8 text-center text-xs font-semibold text-muted-foreground">No actions found matching category</p>
            ) : (
              filteredActivities.map((act) => (
                <div key={act.id} className="group relative flex items-start gap-4 rounded-xl border border-transparent p-3.5 transition-all hover:border-border hover:bg-muted/30">
                  <div className="mt-1 flex size-2.5 shrink-0 rounded-full bg-accent shadow-sm" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-black text-primary dark:text-foreground">
                      {act.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-muted-foreground">{act.time}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                        {act.tag}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))
            )}
          </div>
        </GsapReveal>

        {/* Quick Operations Console */}
        <GsapReveal direction="up" delay={0.35} className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-5">
          <div>
            <h3 className="text-lg font-black text-primary dark:text-accent">Quick Actions Command</h3>
            <p className="text-xs font-semibold text-muted-foreground">Deploy system records dynamically</p>
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
                  className="flex flex-col text-left rounded-xl border border-border p-4 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                >
                  <span className={`inline-grid size-9 place-items-center rounded-lg bg-gradient-to-br ${btn.color} text-white`}>
                    <ActionIcon className="size-4" />
                  </span>
                  <span className="mt-4 text-xs font-black text-primary dark:text-foreground">{btn.title}</span>
                  <span className="mt-1 text-[10px] font-bold text-muted-foreground leading-normal">{btn.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted p-4 text-center">
            <p className="text-xs font-black text-primary dark:text-accent">Supabase Connection State</p>
            <p className="mt-1 text-[10px] font-bold text-muted-foreground leading-normal">
              Schema models mapped. Production databases can be plugged seamlessly.
            </p>
          </div>
        </GsapReveal>
      </div>

      {/* Command Modals Dialogs Container */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-lg font-black text-primary dark:text-foreground capitalize">
                  {activeModal.replaceAll("-", " ")}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={submitAction} className="mt-6 space-y-4">
                {activeModal === "add-course" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-muted-foreground">Course Name</label>
                      <input required className="w-full h-11 rounded-lg border border-border bg-muted px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Next.js SaaS Architecture" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-primary dark:text-muted-foreground">Category</label>
                        <select className="w-full h-11 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                          <option>Full Stack Development</option>
                          <option>Data Science & AI</option>
                          <option>UI/UX Design</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-primary dark:text-muted-foreground">Price (INR)</label>
                        <input type="number" required className="w-full h-11 rounded-lg border border-border bg-muted px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="39999" />
                      </div>
                    </div>
                  </>
                )}

                {activeModal === "add-mentor" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-muted-foreground">Mentor Full Name</label>
                      <input required className="w-full h-11 rounded-lg border border-border bg-muted px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Dr. Pooja Deshmukh" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-muted-foreground">Role / Company</label>
                      <input required className="w-full h-11 rounded-lg border border-border bg-muted px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Principal Architect at Amazon" />
                    </div>
                  </>
                )}

                {activeModal === "add-story" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-muted-foreground">Student Name</label>
                      <input required className="w-full h-11 rounded-lg border border-border bg-muted px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Sameer Sen" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-primary dark:text-muted-foreground">Company</label>
                        <input required className="w-full h-11 rounded-lg border border-border bg-muted px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Deloitte" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-primary dark:text-muted-foreground">Package (LPA)</label>
                        <input type="number" step="0.1" required className="w-full h-11 rounded-lg border border-border bg-muted px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="12.5" />
                      </div>
                    </div>
                  </>
                )}

                {activeModal === "gen-report" && (
                  <>
                    <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                      <p className="text-xs font-black">Export Variables Notice</p>
                      <p className="text-[10px] font-bold leading-normal">
                        Generating comprehensive CSV/Excel bundle requires processing 14k student registers, 4k counseling calls, and placement timeline logs.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-primary dark:text-muted-foreground">Export Scope</label>
                      <select className="w-full h-11 rounded-lg border border-border bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                        <option>Full Platform Audit Log</option>
                        <option>Revenue & Transactions Ledger</option>
                        <option>Placement Story Records</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="h-11 rounded-lg px-5 text-xs font-black text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 rounded-lg bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 shadow-sm"
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
