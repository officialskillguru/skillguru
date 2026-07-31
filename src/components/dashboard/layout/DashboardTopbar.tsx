import { Menu, MessageSquare, Moon, Search, Sun, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/dashboard/layout/NotificationBell";

interface DashboardTopbarProps {
  onOpenMenu: () => void;
}

export function DashboardTopbar({ onOpenMenu }: Readonly<DashboardTopbarProps>) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-20 items-center justify-between px-6 lg:px-10">

        {/* Left: Menu, Logo & Search */}
        <div className="flex flex-1 items-center gap-4 lg:gap-8">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground lg:hidden"
            onClick={onOpenMenu}
            aria-label="Open dashboard navigation"
          >
            <Menu size={20} aria-hidden="true" />
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <img src="/assets/logo/official-skill-guru-navbar.png" alt="SkillGuru" className="h-8 w-auto object-contain" />
          </Link>

          {/* Local Search (Fallback for Global Search) */}
          <div className="hidden max-w-md flex-1 items-center lg:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} aria-hidden="true" />
              <label htmlFor="dashboard-search" className="sr-only">
                Search dashboard
              </label>
              <input
                id="dashboard-search"
                type="text"
                placeholder="Search dashboard... (Ctrl+K)"
                className="h-12 w-full rounded-2xl border border-input bg-muted/50 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                title="Search currently loaded dashboard entities only"
              />
              <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 lg:flex">
                <kbd className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">Ctrl</kbd>
                <kbd className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">K</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground"
            onClick={() => void navigate("/dashboard/chat")}
            aria-label="Open messages"
          >
            <MessageSquare size={20} aria-hidden="true" />
          </Button>
          <NotificationBell />

          {/* Profile Dropdown Trigger (Navigates to Profile for now, until Dropdown is fully built) */}
          <button
            type="button"
            onClick={() => { void navigate("/dashboard/profile"); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95"
            aria-label="View Profile Settings"
          >
            {user?.email?.charAt(0).toUpperCase() || "S"}
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            aria-label="Sign out"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>

      </div>
    </header>
  );
}
