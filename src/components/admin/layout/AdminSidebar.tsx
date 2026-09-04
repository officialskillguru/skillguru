import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderTree,
  Gauge,
  LayoutDashboard,
  MessageSquare,
  RotateCcw,
  Settings,
  ShieldCheck,
  Star,
  Tag,
  Ticket,
  UserCog,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";

import { Logo } from "@/components/common/Logo";
import { siteConfig } from "@/config/site";
import { isActiveRoute } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";
import { initials, formatRole } from "@/lib/adminUi";

type NavIcon = typeof LayoutDashboard;
type NavLink = { label: string; to: string; icon: NavIcon };
type NavEntry =
  | { kind: "link"; label: string; to: string; icon: NavIcon }
  | { kind: "group"; id: string; label: string; items: NavLink[] };

const NAV: NavEntry[] = [
  { kind: "link", label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  {
    kind: "group",
    id: "academics",
    label: "Academics",
    items: [
      { label: "Courses", to: "/admin/courses", icon: BookOpen },
      { label: "Categories", to: "/admin/courses/categories", icon: FolderTree },
      { label: "Students", to: "/admin/students", icon: Users },
      { label: "Counsellors", to: "/admin/users/counsellors", icon: UserCog },
      { label: "Teachers", to: "/admin/users/mentors", icon: BriefcaseBusiness },
      { label: "Assignments", to: "/admin/courses/assignments", icon: ClipboardList },
      { label: "Certificates", to: "/admin/students/certificates", icon: Award },
    ],
  },
  { kind: "link", label: "CRM", to: "/admin/crm", icon: Workflow },
  {
    kind: "group",
    id: "commerce",
    label: "Commerce",
    items: [
      { label: "Payments", to: "/admin/commerce/payments", icon: CircleDollarSign },
      { label: "Refunds", to: "/admin/commerce/refunds", icon: RotateCcw },
      { label: "Coupons", to: "/admin/commerce/coupons", icon: Tag },
      { label: "Orders", to: "/admin/commerce/orders", icon: FileText },
    ],
  },
  {
    kind: "group",
    id: "communications",
    label: "Communications",
    items: [
      { label: "Notifications", to: "/admin/communication/notifications", icon: Bell },
      { label: "Chat", to: "/admin/communication/chat", icon: MessageSquare },
      { label: "Support", to: "/admin/communication/tickets", icon: Ticket },
    ],
  },
  {
    kind: "group",
    id: "content",
    label: "Content",
    items: [
      { label: "Calendar", to: "/admin/calendar", icon: Calendar },
      { label: "Success Stories", to: "/admin/success-stories", icon: Star },
      { label: "Placements", to: "/admin/placements", icon: BriefcaseBusiness },
      { label: "CMS Pages", to: "/admin/cms/pages", icon: FileText },
    ],
  },
  { kind: "link", label: "Analytics", to: "/admin/analytics", icon: Gauge },
  {
    kind: "group",
    id: "settings",
    label: "Settings",
    items: [
      { label: "Invitations", to: "/admin/users/invitations", icon: UserPlus },
      { label: "Audit Logs", to: "/admin/audit-logs", icon: ShieldCheck },
      { label: "System Health", to: "/admin/health", icon: Activity },
      { label: "Knowledge Base", to: "/admin/knowledge-base", icon: BookOpen },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

const EXPANDED_GROUP_KEY = "admin-sidebar-expanded-group";
const SCROLL_POSITION_KEY = "admin-sidebar-scroll-top";

function groupContainingPath(pathname: string): string | null {
  for (const entry of NAV) {
    if (entry.kind === "group" && entry.items.some((item) => isActiveRoute(pathname, item.to))) {
      return entry.id;
    }
  }
  return null;
}

interface AdminSidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function AdminSidebar({ collapsed, onNavigate }: Readonly<AdminSidebarProps>) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const name = auth.authUser?.profile?.fullName;

  const goToProfile = () => {
    void navigate("/admin/profile");
    onNavigate?.();
  };

  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    try {
      return localStorage.getItem(EXPANDED_GROUP_KEY);
    } catch {
      return null;
    }
  });

  // Auto-expand the group containing the current route, but only when the route
  // actually changes — not on every render — so a manual toggle click (e.g.
  // opening "Commerce" while still on a "Content" page) isn't immediately
  // overridden on the next render. Adjusted during render (React's sanctioned
  // pattern for "reset/derive state when a prop changes") rather than in a
  // useEffect, so there's no extra commit+effect round-trip or flash of the
  // previous group before the auto-expand applies.
  const [syncedPathname, setSyncedPathname] = useState(location.pathname);
  if (location.pathname !== syncedPathname) {
    setSyncedPathname(location.pathname);
    const g = groupContainingPath(location.pathname);
    if (g) {
      setExpandedGroup(g);
      try {
        localStorage.setItem(EXPANDED_GROUP_KEY, g);
      } catch {
        /* best-effort persistence only */
      }
    }
  }

  const displayExpandedGroup = expandedGroup;

  const toggleGroup = (id: string) => {
    setExpandedGroup((current) => {
      const next = current === id ? null : id;
      try {
        localStorage.setItem(EXPANDED_GROUP_KEY, next ?? "");
      } catch {
        /* best-effort persistence only */
      }
      return next;
    });
  };

  const navRef = useRef<HTMLElement | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Restore scroll position instantly on mount (no animation on initial load).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    try {
      const saved = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (saved) nav.scrollTop = Number(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-scroll the active item into view (visual only — never steals focus).
  const scrollActiveIntoView = () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeLinkRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  // Handles the case where the active item is already inside a group that's
  // open (no expand animation runs, so onAnimationComplete never fires).
  useEffect(() => {
    scrollActiveIntoView();
  }, [location.pathname, displayExpandedGroup]);

  const handleNavScroll = () => {
    const nav = navRef.current;
    if (!nav) return;
    try {
      sessionStorage.setItem(SCROLL_POSITION_KEY, String(nav.scrollTop));
    } catch {
      /* ignore */
    }
  };

  const activeTo = useMemo(() => {
    // isActiveRoute prefix-matches, so a page like /admin/crm/leads matches both
    // "Dashboard" (/admin) and "CRM" (/admin/crm) — pick the most specific (longest)
    // matching path so only the truly current nav entry is highlighted.
    let best: string | null = null;
    for (const entry of NAV) {
      const candidates = entry.kind === "link" ? [entry.to] : entry.items.map((item) => item.to);
      for (const to of candidates) {
        if (isActiveRoute(location.pathname, to) && (!best || to.length > best.length)) {
          best = to;
        }
      }
    }
    return best;
  }, [location.pathname]);

  const renderLink = (item: NavLink, indent: boolean) => {
    const Icon = item.icon;
    const active = item.to === activeTo;
    return (
      <Link
        key={item.to}
        to={item.to}
        ref={active ? activeLinkRef : undefined}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={[
          "group relative flex min-h-[40px] items-center gap-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed ? "justify-center px-0" : indent ? "px-3" : "px-3",
          active
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
        ].join(" ")}
      >
        {active && (
          <motion.span
            layoutId="admin-nav-active-indicator"
            aria-hidden="true"
            className="absolute inset-0 rounded-md bg-sidebar-accent shadow-sm"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
        <Icon className="relative size-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="relative truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        <div className={`flex min-h-[72px] items-center ${collapsed ? "justify-center px-2" : "px-5"}`}>
          {collapsed ? (
            <div className="grid size-9 place-items-center rounded-lg bg-sidebar-accent font-black text-sidebar-accent-foreground">
              S
            </div>
          ) : (
            <Logo src={siteConfig.logoWordmarkPath} imageClassName="h-8 w-auto" onDark />
          )}
        </div>

        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          className="enterprise-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-6"
        >
          <div className="grid gap-1">
            {NAV.map((entry) => {
              if (entry.kind === "link") {
                return <div key={entry.to}>{renderLink(entry, false)}</div>;
              }

              const isOpen = displayExpandedGroup === entry.id;
              const panelId = `admin-nav-panel-${entry.id}`;
              const headerId = `admin-nav-header-${entry.id}`;

              return (
                <div key={entry.id} className="mb-1">
                  {!collapsed ? (
                    <button
                      type="button"
                      id={headerId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleGroup(entry.id)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-sidebar-muted transition hover:bg-white/5 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>{entry.label}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : null}

                  <AnimatePresence initial={false}>
                    {(isOpen || collapsed) && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={collapsed ? undefined : headerId}
                        initial={collapsed ? false : { height: 0, opacity: 0 }}
                        animate={collapsed ? undefined : { height: "auto", opacity: 1 }}
                        exit={collapsed ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        onAnimationComplete={scrollActiveIntoView}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-0.5 pt-0.5">
                          {entry.items.map((item) => renderLink(item, true))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto p-4">
          <button
            type="button"
            onClick={goToProfile}
            title={collapsed ? "My Profile" : undefined}
            aria-label={`My Profile — ${name ?? "Admin User"}, ${formatRole(auth.authUser?.highestRole)}`}
            className={`flex w-full items-center gap-3 rounded-lg bg-white/5 p-3 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${collapsed ? "justify-center" : ""}`}
          >
            <div aria-hidden="true" className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground shadow-inner">
              {initials(name, "A")}
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
            </div>
            {!collapsed && (
              <div aria-hidden="true" className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{name ?? "Admin User"}</p>
                <p className="truncate text-[11px] text-sidebar-muted">{auth.authUser?.profile?.email ?? ""}</p>
              </div>
            )}
          </button>
        </div>
      </div>
    </MotionConfig>
  );
}
