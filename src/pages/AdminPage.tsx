import { useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
} from "lucide-react";
import { toast } from "sonner";

import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { CommandPalette } from "@/components/common/CommandPalette";
import { NotificationBell } from "@/components/dashboard/layout/NotificationBell";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useFocusTrapDrawer } from "@/hooks/useFocusTrapDrawer";

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

function AdminMobileDrawer({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const panelRef = useRef<HTMLElement | null>(null);
  useFocusTrapDrawer(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close admin navigation"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 w-[min(88vw,320px)] shadow-2xl"
      >
        <AdminSidebar onNavigate={onClose} />
      </aside>
    </div>
  );
}

export default function AdminPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("admin-sidebar-collapsed") === "1");
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
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
        <AdminSidebar collapsed={collapsed} />
      </aside>

      <AdminMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

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

              <button
                type="button"
                onClick={() => { void navigate("/admin/profile"); }}
                className="flex items-center gap-3 rounded-xl px-1.5 py-1 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`My Profile — ${auth.authUser?.profile?.fullName ?? "Admin User"}, ${formatRole(auth.authUser?.highestRole)}`}
              >
                <div aria-hidden="true" className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {initials(auth.authUser?.profile?.fullName, "A")}
                </div>
                <div aria-hidden="true" className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {auth.authUser?.profile?.fullName ?? "Admin User"}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                    {formatRole(auth.authUser?.highestRole)}
                  </p>
                </div>
              </button>

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
