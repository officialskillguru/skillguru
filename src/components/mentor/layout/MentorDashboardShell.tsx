import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const tabs = ["Overview", "Assigned Courses", "Course Builder", "Students", "Tasks", "Reviews", "Analytics", "Notifications", "Profile"] as const;
export type MentorTab = typeof tabs[number];

interface MentorDashboardShellProps {
  activeTab: MentorTab;
  onTabChange: (tab: MentorTab) => void;
  children: ReactNode;
}

export function MentorDashboardShell({ activeTab, onTabChange, children }: MentorDashboardShellProps) {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="min-h-svh bg-muted">
      <a
        href="#mentor-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-secondary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-secondary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-black text-foreground">Mentor Dashboard</h1>
            <p className="text-sm text-muted-foreground">{auth.user?.email ?? "Mentor"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-md border border-border p-2 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="rounded-md border border-border px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="h-max rounded-xl bg-primary p-5 text-primary-foreground shadow-md">
          <p className="text-xs font-black uppercase tracking-widest text-accent">Mentor Console</p>
          <nav aria-label="Mentor dashboard" className="mt-6 grid gap-2 text-sm font-bold text-primary-foreground/70">
            {tabs.map((item) => (
              <button
                key={item}
                onClick={() => onTabChange(item)}
                aria-current={activeTab === item ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeTab === item ? "bg-primary-foreground/20 text-primary-foreground" : "hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section id="mentor-main-content" className="space-y-6">
          <p className="sr-only" aria-live="polite">{activeTab} section</p>
          {children}
        </section>
      </div>
    </main>
  );
}
