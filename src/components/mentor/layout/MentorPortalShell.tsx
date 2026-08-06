import { useState, useRef, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Star,
  Sun,
  User as UserIcon,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/common/Logo";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { NotificationBell } from "@/components/dashboard/layout/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isActiveRoute } from "@/lib/routes";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { label: "Overview", to: "/mentor/overview", icon: LayoutDashboard },
  { label: "Assigned Courses", to: "/mentor/courses", icon: BookOpen },
  { label: "Course Builder", to: "/mentor/courses/new", icon: PlusCircle },
  { label: "Students", to: "/mentor/students", icon: Users },
  { label: "Tasks", to: "/mentor/tasks", icon: ClipboardList },
  { label: "Reviews", to: "/mentor/reviews", icon: Star },
  { label: "Analytics", to: "/mentor/analytics", icon: BarChart3 },
  { label: "Inbox", to: "/mentor/messages", icon: MessageSquare, section: "Communication" },
  { label: "Announcements", to: "/mentor/announcements", icon: Megaphone },
  { label: "Notifications", to: "/mentor/notifications", icon: Bell },
  { label: "Profile", to: "/mentor/profile", icon: UserIcon },
] as const;

function initials(name: string | null | undefined, fallback: string) {
  const source = name?.trim();
  if (!source) return fallback;
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || fallback;
}

function activeNavTo(pathname: string): string | null {
  // Some nav targets are path-prefixes of others (e.g. "/mentor/courses" is a
  // prefix of "/mentor/courses/new"), so isActiveRoute alone would highlight
  // both. Pick the single longest matching target instead.
  let best: string | null = null;
  for (const item of navItems) {
    if (isActiveRoute(pathname, item.to) && (best === null || item.to.length > best.length)) {
      best = item.to;
    }
  }
  return best;
}

function Sidebar({ collapsed, onNavigate }: Readonly<{ collapsed?: boolean; onNavigate?: () => void }>) {
  const location = useLocation();
  const auth = useAuth();
  const name = auth.authUser?.profile?.fullName;
  const activeTo = activeNavTo(location.pathname);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={`flex min-h-[72px] items-center ${collapsed ? "justify-center px-2" : "px-5"}`}>
        {collapsed ? (
          <div className="grid size-9 place-items-center rounded-lg bg-sidebar-accent font-black text-sidebar-accent-foreground">S</div>
        ) : (
          <Logo className="text-white" />
        )}
      </div>
      <nav aria-label="Mentor portal" className="flex-1 overflow-y-auto px-3 py-6">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">
            Mentor Console
          </p>
        )}
        <div className="grid gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.to === activeTo;
            const section = "section" in item ? item.section : undefined;
            return (
              <div key={item.to}>
                {section && !collapsed && (
                  <p className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">{section}</p>
                )}
                {section && collapsed && <div className="my-2 border-t border-white/10" aria-hidden="true" />}
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group flex min-h-[40px] items-center gap-3 rounded-md text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    collapsed ? "justify-center px-0" : "px-3",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
                  ].join(" ")}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>
      <div className="mt-auto p-4">
        <div className={`flex items-center gap-3 rounded-lg bg-white/5 p-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground shadow-inner">
            {initials(name, "M")}
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{name ?? "Mentor"}</p>
              <p className="truncate text-[11px] text-sidebar-muted">{auth.authUser?.profile?.email ?? ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MentorPortalShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("mentor-sidebar-collapsed") === "1");
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const auth = useAuth();
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const drawerContainerRef = useRef<HTMLDivElement>(null);

  const closeDrawer = () => {
    setDrawerOpen(false);
    mobileMenuButtonRef.current?.focus();
  };

  // Trap focus inside the mobile drawer (backdrop close button + panel links)
  // while it is open, close on Escape, and move focus into the drawer when it
  // opens (WCAG 2.1.2, 2.4.3). The trap spans the whole container, not just
  // the panel, so Shift+Tab from the initial dialog focus can't escape past
  // the backdrop's close button.
  useEffect(() => {
    if (!drawerOpen) return;
    const panel = drawerPanelRef.current;
    const container = drawerContainerRef.current;
    panel?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const focusable = container.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("mentor-sidebar-collapsed", next ? "1" : "0");
  };

  const handleToggleTheme = () => {
    toggleTheme();
    toast.success(theme === "dark" ? "Light mode enabled" : "Dark mode enabled");
  };

  return (
    <div
      className="min-h-svh bg-muted/30 text-foreground lg:grid"
      style={{ gridTemplateColumns: collapsed ? "72px minmax(0,1fr)" : "260px minmax(0,1fr)" }}
    >
      <a
        href="#mentor-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-secondary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-secondary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-svh shadow-sm lg:block transition-[width] duration-200 motion-reduce:transition-none">
        <Sidebar collapsed={collapsed} />
      </aside>

      {drawerOpen ? (
        <div ref={drawerContainerRef} className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close mentor navigation"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <aside
            ref={drawerPanelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Mentor navigation menu"
            className="absolute inset-y-0 left-0 w-[min(88vw,320px)] shadow-2xl focus:outline-none"
          >
            <Sidebar onNavigate={closeDrawer} />
          </aside>
        </div>
      ) : null}

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
          <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              ref={mobileMenuButtonRef}
              className="grid size-10 place-items-center rounded-md border border-border bg-card text-foreground lg:hidden transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              aria-label="Open mentor navigation"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground lg:grid transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
            >
              {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
            </button>

            <div className="hidden lg:block">
              <Breadcrumbs pathname={location.pathname} rootPath="/mentor" rootLabel="Mentor" />
            </div>

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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-md p-1 pr-2 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Mentor account menu"
                  >
                    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {initials(auth.authUser?.profile?.fullName, "M")}
                    </span>
                    <span className="hidden md:block">
                      <span className="block text-sm font-semibold leading-tight text-foreground">
                        {auth.authUser?.profile?.fullName ?? "Mentor"}
                      </span>
                      <span className="block text-[11px] font-medium leading-tight text-muted-foreground">Mentor</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {auth.authUser?.profile?.fullName ?? "Mentor"}
                    </span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {auth.authUser?.profile?.email ?? ""}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/mentor/profile">
                      <UserIcon className="mr-2 size-4" aria-hidden="true" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void auth.logout()}>
                    <LogOut className="mr-2 size-4" aria-hidden="true" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main id="mentor-main-content" className="px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
