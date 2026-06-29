import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/common/Logo";
import { isActiveRoute, routes } from "@/lib/routes";

const navGroups = [
  {
    label: "Core",
    items: [{ label: "Dashboard", to: routes.admin.dashboard, icon: LayoutDashboard }],
  },
  {
    label: "Academics",
    items: [
      { label: "Courses", to: routes.admin.courses, icon: BookOpen },
      { label: "Categories", to: "/admin/categories", icon: Gauge },
      { label: "Programs", to: "/admin/programs", icon: GraduationCap },
      { label: "Certifications", to: "/admin/certifications", icon: ShieldCheck },
    ],
  },
  {
    label: "Students",
    items: [
      { label: "Students", to: "/admin/students", icon: Users },
      { label: "Enrollments", to: "/admin/enrollments", icon: BookOpen },
      { label: "Learning Progress", to: "/admin/progress", icon: Sparkles },
      { label: "Certificates", to: "/admin/certificates", icon: ShieldCheck },
    ],
  },
  {
    label: "Mentors",
    items: [
      { label: "Mentors", to: routes.admin.faculty, icon: Users },
      { label: "Applications", to: "/admin/mentor-applications", icon: FileText },
      { label: "Assignments", to: "/admin/mentor-assignments", icon: BriefcaseBusiness },
      { label: "Reviews", to: "/admin/mentor-reviews", icon: Star },
    ],
  },
  {
    label: "Placements",
    items: [
      { label: "Success Stories", to: routes.admin.testimonials, icon: Star },
      { label: "Hiring Partners", to: "/admin/hiring-partners", icon: BriefcaseBusiness },
      { label: "Placement Records", to: "/admin/placement-records", icon: GraduationCap },
      { label: "Statistics", to: "/admin/placement-statistics", icon: Gauge },
    ],
  },
  {
    label: "Revenue & CRM",
    items: [
      { label: "Leads", to: routes.admin.leads, icon: MessageSquare },
      { label: "Pipeline", to: "/admin/pipeline", icon: Bot },
      { label: "Revenue", to: "/admin/revenue", icon: CircleDollarSign },
      { label: "Transactions", to: "/admin/transactions", icon: CircleDollarSign },
      { label: "Coupons", to: "/admin/coupons", icon: Sparkles },
      { label: "Refunds", to: "/admin/refunds", icon: FileText },
    ],
  },
  {
    label: "Content & AI",
    items: [
      { label: "Blogs", to: routes.admin.blogs, icon: FileText },
      { label: "FAQ", to: "/admin/faq", icon: MessageSquare },
      { label: "Homepage Sections", to: "/admin/homepage", icon: LayoutDashboard },
      { label: "AI Guidance", to: "/admin/ai-guidance", icon: Bot },
      { label: "Counselling Requests", to: "/admin/counselling", icon: MessageSquare },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Users & Roles", to: "/admin/users-roles", icon: ShieldCheck },
      { label: "Permissions", to: "/admin/permissions", icon: ShieldCheck },
      { label: "SEO", to: routes.admin.seo, icon: Search },
      { label: "Audit", to: routes.admin.audit, icon: ShieldCheck },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
] as const;

function Sidebar({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-[#081A4A] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Logo />
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
          Enterprise Admin
        </p>
      </div>
      <nav className="admin-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
              {group.label}
            </p>
            <div className="grid gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(location.pathname, item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={[
                      "group flex min-h-10 items-center gap-3 rounded-[12px] px-3 text-sm font-bold transition",
                      active
                        ? "bg-[#22D3EE] text-[#111E79] shadow-[0_14px_32px_rgba(34,211,238,0.22)]"
                        : "text-white/68 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="rounded-[16px] border border-cyan-300/20 bg-white/6 p-4">
          <p className="text-sm font-black">Supabase-ready</p>
          <p className="mt-1 text-xs leading-5 text-white/58">Tables, forms, filters, roles, and workflows are prepared for integration.</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const location = useLocation();
  const crumbs = location.pathname.split("/").filter(Boolean);
  const section = crumbs.at(-1)?.replaceAll("-", " ") ?? "dashboard";

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      toast.success("Dark Mode activated.");
    } else {
      document.documentElement.classList.remove("dark");
      toast.success("Light Mode activated.");
    }
  };

  return (
    <main className="min-h-svh bg-[#EEF3FA] text-[#0F172A] dark:bg-[#020617] dark:text-white lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh lg:block">
        <Sidebar />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-[#020617]/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,320px)] shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[#DDE7F6] bg-white/92 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex min-h-18 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-[12px] border border-[#DDE7F6] bg-white text-[#111E79] dark:border-slate-800 dark:bg-slate-900 dark:text-cyan-300 lg:hidden"
              aria-label="Open admin navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => toast.success("Sidebar state locked.")}
              className="hidden size-10 place-items-center rounded-[12px] border border-[#DDE7F6] bg-white text-[#111E79] dark:border-slate-800 dark:bg-slate-900 dark:text-cyan-300 lg:grid"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-5" />
            </button>

            <label className="hidden h-11 min-w-0 flex-1 items-center gap-3 rounded-[14px] border border-[#DDE7F6] bg-[#F8FAFC] px-4 text-sm text-[#64748B] dark:border-slate-800 dark:bg-slate-900 md:flex">
              <Search className="size-4 text-[#111E79] dark:text-cyan-300" />
              <input
                className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-[#94A3B8] dark:text-white"
                placeholder="Search students, courses, leads, mentors..."
              />
              <span className="rounded-md border border-[#DDE7F6] bg-white px-2 py-1 text-[11px] font-black dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">⌘ K</span>
            </label>

            <div className="ml-auto hidden items-center gap-2 text-sm font-bold text-[#64748B] dark:text-slate-400 xl:flex">
              <span>Admin</span>
              <ChevronRight className="size-4" />
              <span className="capitalize text-[#111E79] dark:text-cyan-300">{section}</span>
            </div>

            <button
              type="button"
              onClick={() => toast.success("No unread operations notifications.")}
              className="grid size-10 place-items-center rounded-[12px] border border-[#DDE7F6] bg-white text-[#111E79] dark:border-slate-800 dark:bg-slate-900 dark:text-cyan-300 shadow-[0_8px_22px_rgba(15,43,122,0.06)]"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => toast.success("Outbox messaging channels active.")}
              className="grid size-10 place-items-center rounded-[12px] border border-[#DDE7F6] bg-white text-[#111E79] dark:border-slate-800 dark:bg-slate-900 dark:text-cyan-300 shadow-[0_8px_22px_rgba(15,43,122,0.06)]"
              aria-label="Messages"
            >
              <MessageSquare className="size-4" />
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="grid size-10 place-items-center rounded-[12px] border border-[#DDE7F6] bg-white text-[#111E79] dark:border-slate-800 dark:bg-slate-900 dark:text-cyan-300 shadow-[0_8px_22px_rgba(15,43,122,0.06)]"
              aria-label="Dark mode"
            >
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <div className="flex items-center gap-3 rounded-[14px] border border-[#DDE7F6] bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900 shadow-[0_8px_22px_rgba(15,43,122,0.06)]">
              <span className="grid size-8 place-items-center rounded-[10px] bg-[#111E79] text-xs font-black text-white dark:bg-cyan-400 dark:text-[#111E79]">
                HR
              </span>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-black text-[#111E79] dark:text-white">Super Admin</p>
                <p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">Operations</p>
              </div>
            </div>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
