import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award,
  BookOpen,
  Briefcase,
  CheckSquare,
  Compass,
  FileText,
  Heart,
  LayoutDashboard,
  Settings,
  StickyNote,
  User,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentDashboard } from "@/hooks/student/useStudentDashboard";
import { useFocusTrapDrawer } from "@/hooks/useFocusTrapDrawer";

const NAV_GROUPS = [
  {
    title: "LEARNING",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, disabled: false },
      { name: "My Courses", path: "/dashboard/courses", icon: BookOpen, disabled: false },
      { name: "Learning Tasks", path: "/dashboard/assignments", icon: CheckSquare, disabled: false },
      { name: "My Notes", path: "/dashboard/notes", icon: StickyNote, disabled: false },
    ]
  },
  {
    title: "CAREER",
    items: [
      { name: "Placement", path: "/dashboard/placement", icon: Briefcase, disabled: false },
      { name: "Resume Builder", path: "/dashboard/resume-builder", icon: FileText, disabled: false },
      { name: "AI Career Guidance", path: "/dashboard/career-guidance", icon: Compass, disabled: false },
      { name: "Certificates", path: "/dashboard/certificates", icon: Award, disabled: false },
      { name: "Mentors", path: "/dashboard/mentors", icon: Users, disabled: false },
      { name: "Wishlist", path: "/dashboard/wishlist", icon: Heart, disabled: false },
    ]
  },
  {
    title: "ACCOUNT",
    items: [
      { name: "Profile", path: "/dashboard/profile", icon: User, disabled: false },
      { name: "Settings", path: "/dashboard/settings", icon: Settings, disabled: false },
    ]
  }
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: Readonly<SidebarContentProps>) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Dashboard" className="flex-1 space-y-8 overflow-y-auto p-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <h4 className="mb-3 px-3 text-xs font-black tracking-widest text-muted-foreground uppercase">
              {group.title}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                // Ensure exact match for dashboard home, but prefix match for subpages
                const isActive = item.path === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.path);

                const content = (
                  <>
                    <item.icon
                      aria-hidden="true"
                      size={18}
                      className={cn(
                        "transition-colors",
                        item.disabled ? "text-muted-foreground" :
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                      )}
                    />
                    {item.name}
                  </>
                );

                if (item.disabled) {
                  return (
                    <div
                      key={item.path}
                      aria-disabled="true"
                      className="group flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground opacity-50 transition-all duration-200"
                      title="Coming in a future release"
                    >
                      {content}
                      <span className="sr-only"> (coming in a future release)</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Panel - real enrollment/certificate counts, not fabricated gamification. Sits
          outside the scrollable nav region so it stays visible instead of scrolling away. */}
      <SidebarProgressSummary />
    </div>
  );
}

/** Static desktop sidebar. Hidden below `lg` - use MobileSidebarDrawer for smaller viewports. */
export function DashboardSidebar() {
  return (
    <aside className="fixed left-0 top-20 z-30 hidden h-[calc(100vh-5rem)] w-[280px] border-r border-border bg-background lg:block">
      <SidebarContent />
    </aside>
  );
}

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Mobile/tablet fallback for DashboardSidebar, which is hidden below `lg`. */
export function MobileSidebarDrawer({ open, onClose }: Readonly<MobileSidebarDrawerProps>) {
  const panelRef = useRef<HTMLElement | null>(null);
  useFocusTrapDrawer(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close dashboard navigation"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 w-[min(88vw,320px)] bg-background shadow-2xl"
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

function SidebarProgressSummary() {
  const { stats, isLoadingStats } = useStudentDashboard();

  return (
    <div className="border-t border-border bg-muted/30 p-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Progress</p>
        {isLoadingStats ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                <BookOpen size={12} aria-hidden="true" /> Enrolled
              </span>
              <span className="text-lg font-black text-foreground">{stats?.enrolledCourses ?? 0}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                <Award size={12} aria-hidden="true" /> Certificates
              </span>
              <span className="text-lg font-black text-foreground">{stats?.certificates ?? 0}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
