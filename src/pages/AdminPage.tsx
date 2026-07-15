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

import { useAuth } from "@/hooks/useAuth";

const navGroups = [
  {
    label: "Core",
    permission: "canViewAdminDashboard",
    items: [{ label: "Dashboard", to: routes.admin.dashboard, icon: LayoutDashboard }],
  },
  {
    label: "Academics",
    permission: "canManageCourses",
    items: [
      { label: "Courses", to: routes.admin.courses, icon: BookOpen },
      { label: "Categories", to: "/admin/categories", icon: Gauge },
      { label: "Programs", to: "/admin/programs", icon: GraduationCap },
      { label: "Certifications", to: "/admin/certifications", icon: ShieldCheck },
    ],
  },
  {
    label: "Students",
    permission: "canManageStudents",
    items: [
      { label: "Students", to: "/admin/students", icon: Users },
      { label: "Enrollments", to: "/admin/enrollments", icon: BookOpen },
      { label: "Learning Progress", to: "/admin/progress", icon: Sparkles },
      { label: "Certificates", to: "/admin/certificates", icon: ShieldCheck },
    ],
  },
  {
    label: "Mentors",
    permission: "canManageMentors",
    items: [
      { label: "Mentors", to: routes.admin.faculty, icon: Users },
      { label: "Applications", to: "/admin/mentor-applications", icon: FileText },
      { label: "Assignments", to: "/admin/mentor-assignments", icon: BriefcaseBusiness },
      { label: "Reviews", to: "/admin/mentor-reviews", icon: Star },
    ],
  },
  {
    label: "Placements",
    permission: "canManageCMS",
    items: [
      { label: "Success Stories", to: routes.admin.testimonials, icon: Star },
      { label: "Hiring Partners", to: "/admin/hiring-partners", icon: BriefcaseBusiness },
      { label: "Placement Records", to: "/admin/placement-records", icon: GraduationCap },
      { label: "Statistics", to: "/admin/placement-statistics", icon: Gauge },
    ],
  },
  {
    label: "Revenue & CRM",
    permission: "canManagePayments",
    items: [
      { label: "Leads", to: routes.admin.leads, icon: MessageSquare },
      { label: "Pipeline", to: "/admin/pipeline", icon: Bot },
      { label: "Revenue", to: "/admin/revenue", icon: CircleDollarSign },
      { label: "Payments", to: routes.admin.payments, icon: CircleDollarSign },
      { label: "Coupons", to: "/admin/coupons", icon: Sparkles },
      { label: "Refunds", to: "/admin/refunds", icon: FileText },
    ],
  },
  {
    label: "Content & AI",
    permission: "canManageCMS",
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
    permission: "canManageUsers",
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
  const auth = useAuth();
  
  // Filter nav groups based on permissions
  const visibleGroups = navGroups.filter(group => {
    if (!group.permission) return true;
    return auth.authUser?.permissions?.includes(group.permission);
  });

  return (
    <div className="flex h-full flex-col bg-primary text-primary-foreground">
      <div className="border-b border-primary-foreground/10 px-5 py-5">
        <Logo onDark />
        <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-accent/80">
          Enterprise Admin
        </p>
      </div>
      <nav className="admin-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-primary-foreground/40">
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
                      "group flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
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
      <div className="border-t border-primary-foreground/10 p-4">
        <div className="rounded-xl border border-accent/20 bg-primary-foreground/5 p-4">
          <p className="text-sm font-black">Supabase-ready</p>
          <p className="mt-1 text-xs leading-5 text-primary-foreground/60">Tables, forms, filters, roles, and workflows are prepared for integration.</p>
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
    <main className="min-h-svh bg-muted text-foreground lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh lg:block">
        <Sidebar />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,320px)] shadow-xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="flex min-h-18 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-md border border-border bg-card text-primary lg:hidden transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open admin navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => toast.success("Sidebar state locked.")}
              className="hidden size-10 place-items-center rounded-md border border-border bg-card text-primary lg:grid transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-5" />
            </button>

            <label className="hidden h-11 min-w-0 flex-1 items-center gap-3 rounded-md border border-border bg-muted px-4 text-sm text-muted-foreground md:flex focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
              <Search className="size-4 text-primary" />
              <input
                className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-muted-foreground"
                placeholder="Search students, courses, leads, mentors..."
              />
              <span className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-black text-muted-foreground">⌘ K</span>
            </label>

            <div className="ml-auto hidden items-center gap-2 text-sm font-bold text-muted-foreground xl:flex">
              <span>Admin</span>
              <ChevronRight className="size-4" />
              <span className="capitalize text-primary">{section}</span>
            </div>

            <button
              type="button"
              onClick={() => toast.success("No unread operations notifications.")}
              className="grid size-10 place-items-center rounded-md border border-border bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => toast.success("Outbox messaging channels active.")}
              className="grid size-10 place-items-center rounded-md border border-border bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Messages"
            >
              <MessageSquare className="size-4" />
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="grid size-10 place-items-center rounded-md border border-border bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dark mode"
            >
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <div className="flex items-center gap-3 rounded-md border border-border bg-card px-2.5 py-2 shadow-sm transition">
              <span className="grid size-8 place-items-center rounded bg-primary text-xs font-black text-primary-foreground">
                HR
              </span>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-black text-foreground">Super Admin</p>
                <p className="text-[11px] font-semibold text-muted-foreground">Operations</p>
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
