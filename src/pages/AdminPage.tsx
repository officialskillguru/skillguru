import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gauge,
  Heart,
  LayoutDashboard,
  Bell,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Tag,
  Ticket,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/common/Logo";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { CommandPalette } from "@/components/common/CommandPalette";
import { NotificationBell } from "@/components/dashboard/layout/NotificationBell";
import { isActiveRoute } from "@/lib/routes";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const navGroups = [
  {
    label: "",
    items: [{ label: "Dashboard", to: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "ACADEMICS",
    items: [
      { label: "Courses",       to: "/admin/courses",               icon: BookOpen },
      { label: "Students",      to: "/admin/students",              icon: Users },
      { label: "Mentors",       to: "/admin/users/mentors",         icon: BriefcaseBusiness },
      { label: "Assignments",   to: "/admin/courses/assignments",   icon: ClipboardList },
      { label: "Certificates",  to: "/admin/students/certificates", icon: Award },
      { label: "Reviews",       to: "/admin/courses/reviews",       icon: Star },
    ],
  },
  {
    label: "CRM",
    items: [
      { label: "Leads",         to: "/admin/crm",           icon: Workflow },
      { label: "Pipeline",      to: "/admin/crm/pipeline",  icon: Gauge },
      { label: "Follow-ups",    to: "/admin/crm/followups", icon: Heart },
      { label: "Tasks",         to: "/admin/crm/tasks",     icon: ClipboardList },
    ],
  },
  {
    label: "COMMERCE",
    items: [
      { label: "Payments",      to: "/admin/commerce/payments", icon: CircleDollarSign },
      { label: "Refunds",       to: "/admin/commerce/refunds",  icon: RotateCcw },
      { label: "Coupons",       to: "/admin/commerce/coupons",  icon: Tag },
      { label: "Orders",        to: "/admin/commerce/orders",   icon: FileText },
    ],
  },
  {
    label: "COMMUNICATIONS",
    items: [
      { label: "Notifications", to: "/admin/communication/notifications", icon: Bell },
      { label: "Chat",          to: "/admin/communication/chat",          icon: MessageSquare },
      { label: "Support",       to: "/admin/communication/tickets",       icon: Ticket },
    ],
  },
  {
    label: "CONTENT & CALENDAR",
    items: [
      { label: "Calendar",      to: "/admin/calendar",       icon: Calendar },
      { label: "Success Stories",to: "/admin/success-stories",icon: Star },
      { label: "Placements",    to: "/admin/placements",     icon: BriefcaseBusiness },
      { label: "CMS Pages",     to: "/admin/cms/pages",      icon: FileText },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { label: "Analytics",     to: "/admin/analytics", icon: Gauge },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Invitations",    to: "/admin/users/invitations", icon: UserPlus },
      { label: "Audit Logs",     to: "/admin/audit-logs",        icon: ShieldCheck },
      { label: "System Health",  to: "/admin/health",            icon: Activity },
      { label: "Knowledge Base", to: "/admin/knowledge-base",    icon: BookOpen },
      { label: "Settings",       to: "/admin/settings",          icon: Settings },
    ],
  },
] as const;

function initials(name: string | null | undefined, fallback: string) {
  const source = name?.trim();
  if (!source) return fallback;
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || fallback;
}

function formatRole(highestRole: string | undefined) {
  if (!highestRole) return "Admin";
  return highestRole
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Sidebar({ collapsed, onNavigate }: Readonly<{ collapsed?: boolean; onNavigate?: () => void }>) {
  const location = useLocation();
  const auth = useAuth();
  const name = auth.authUser?.profile?.fullName;

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={`flex min-h-[72px] items-center ${collapsed ? "justify-center px-2" : "px-5"}`}>
        {collapsed ? (
          <div className="grid size-9 place-items-center rounded-lg bg-sidebar-accent font-black text-sidebar-accent-foreground">S</div>
        ) : (
          <Logo className="text-white" />
        )}
      </div>
      <nav className="admin-scrollbar flex-1 overflow-y-auto px-3 py-6">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            {group.label && !collapsed && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">
                {group.label}
              </p>
            )}
            <div className="grid gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(location.pathname, item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "group flex min-h-[40px] items-center gap-3 rounded-md text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      collapsed ? "justify-center px-0" : "px-3",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
                    ].join(" ")}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <div className={`flex items-center gap-3 rounded-lg bg-white/5 p-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground shadow-inner">
            {initials(name, "A")}
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{name ?? "Admin User"}</p>
              <p className="truncate text-[11px] text-sidebar-muted">{auth.authUser?.profile?.email ?? ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("admin-sidebar-collapsed") === "1");
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const auth = useAuth();

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("admin-sidebar-collapsed", next ? "1" : "0");
  };

  const handleToggleTheme = () => {
    toggleTheme();
    toast.success(theme === "dark" ? "Light mode enabled" : "Dark mode enabled");
  };

  return (
    <main
      className="min-h-svh bg-muted/30 text-foreground lg:grid"
      style={{ gridTemplateColumns: collapsed ? "72px minmax(0,1fr)" : "260px minmax(0,1fr)" }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-secondary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-secondary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-svh shadow-sm lg:block transition-[width] duration-200">
        <Sidebar collapsed={collapsed} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,320px)] shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
          <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-md border border-border bg-card text-foreground lg:hidden transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open admin navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground lg:grid transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
            >
              {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </button>

            <div className="hidden lg:block">
              <Breadcrumbs pathname={location.pathname} rootPath="/admin" rootLabel="Admin" />
            </div>

            <button
              type="button"
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="hidden h-10 max-w-xl flex-1 items-center gap-3 rounded-md border border-border bg-card px-4 text-sm text-muted-foreground md:flex hover:ring-2 hover:ring-ring hover:border-transparent transition-all text-left shadow-sm ml-4"
            >
              <Search className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 font-medium">Search students, courses, orders...</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">⌘K</kbd>
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleToggleTheme}
                className="grid size-10 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
              </button>

              <NotificationBell />

              <div className="hidden h-8 w-px bg-border sm:block mx-1" />

              <div className="flex items-center gap-3">
                <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {initials(auth.authUser?.profile?.fullName, "A")}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {auth.authUser?.profile?.fullName ?? "Admin User"}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                    {formatRole(auth.authUser?.highestRole)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void auth.logout()}
                className="flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-bold text-foreground transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>
        <div id="main-content" className="px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </section>
      <CommandPalette />
    </main>
  );
}
