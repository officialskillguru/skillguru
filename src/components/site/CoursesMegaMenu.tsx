import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  ChevronDown,
  Cpu,
  Palette,
  Landmark,
  Cross,
  Wrench,
  Building2,
  ShieldCheck,
  Megaphone,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { listPublicCategories } from "@/services/courses.service";

// Purely cosmetic name -> icon mapping. No DB icon column exists (and none was
// requested); this just makes the menu feel designed. Falls back to a generic
// icon for any category name that doesn't match a keyword below.
const ICON_RULES: { pattern: RegExp; icon: LucideIcon }[] = [
  { pattern: /software|it|web|cloud|devops|data|ai|cyber/i, icon: Cpu },
  { pattern: /design|ux|ui|graphic/i, icon: Palette },
  { pattern: /finance|account|business/i, icon: Landmark },
  { pattern: /health|medical/i, icon: Cross },
  { pattern: /mechanical|civil|architecture|engineer/i, icon: Wrench },
  { pattern: /market/i, icon: Megaphone },
  { pattern: /law|legal/i, icon: ShieldCheck },
  { pattern: /management|hr/i, icon: Building2 },
];

function iconFor(name: string): LucideIcon {
  return ICON_RULES.find((r) => r.pattern.test(name))?.icon ?? GraduationCap;
}

function categoryHref(slug: string) {
  return `${routes.courses}?category=${encodeURIComponent(slug)}`;
}

/** Desktop hover/focus mega-menu for the "Courses" nav item. */
export function CoursesMegaMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ["public-categories"],
    queryFn: listPublicCategories,
    staleTime: 5 * 60 * 1000,
  });

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  // Small grace period so moving the pointer diagonally from the trigger down
  // into the panel doesn't close the menu mid-travel.
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleFocusOut = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.relatedTarget)) {
      setOpen(false);
    }
  };

  const hasCategories = !isLoading && !isError && (categories?.length ?? 0) > 0;

  return (
    <div
      ref={containerRef}
      className="group relative"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      onFocus={() => setOpen(true)}
      onBlur={handleFocusOut}
    >
      <NavLink
        to={routes.courses}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="true"
        className={({ isActive }) =>
          cn(
            "nav-link-premium inline-flex h-10 items-center gap-1 whitespace-nowrap text-sm font-bold text-primary transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-2",
            isActive && "text-secondary",
          )
        }
      >
        Courses
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </NavLink>

      {open && (
        <div className="absolute left-1/2 top-full z-30 w-[min(90vw,720px)] -translate-x-1/2 pt-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
            {isLoading && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}

            {isError && (
              <Link to={routes.courses} className="block rounded-md px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-secondary">
                Browse Courses
              </Link>
            )}

            {!isLoading && !isError && !hasCategories && (
              <Link to={routes.courses} className="block rounded-md px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-secondary">
                Browse all courses
              </Link>
            )}

            {hasCategories && (
              <>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {categories!.map((category) => {
                    const Icon = iconFor(category.name);
                    return (
                      <div key={category.id} className="rounded-lg p-2">
                        <Link
                          to={categoryHref(category.slug)}
                          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-bold text-primary transition hover:bg-muted hover:text-secondary focus-visible:outline-none focus-visible:bg-muted focus-visible:text-secondary"
                        >
                          <Icon className="size-4.5 shrink-0 text-secondary" aria-hidden="true" />
                          <span className="truncate">{category.name}</span>
                        </Link>
                        {category.subcategories.length > 0 && (
                          <div className="ml-7 mt-0.5 flex flex-col">
                            {category.subcategories.slice(0, 4).map((sub) => (
                              <Link
                                key={sub.id}
                                to={categoryHref(sub.slug)}
                                className="truncate rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-secondary focus-visible:outline-none focus-visible:bg-muted focus-visible:text-secondary"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-border pt-2">
                  <Link
                    to={routes.courses}
                    className="flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm font-black text-secondary transition hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
                  >
                    <BriefcaseBusiness className="size-4.5" aria-hidden="true" />
                    View All Courses
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile tap/accordion variant, rendered inside the nav Drawer. */
export function CoursesMegaMenuMobile({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
  const [expanded, setExpanded] = useState(false);
  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ["public-categories"],
    queryFn: listPublicCategories,
    staleTime: 5 * 60 * 1000,
  });

  const hasCategories = !isLoading && !isError && (categories?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center justify-between rounded-md px-4 py-3">
        <Link to={routes.courses} onClick={onNavigate} className="flex-1 text-base font-bold text-primary">
          Courses
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse course categories" : "Expand course categories"}
          className="rounded-md p-2 text-primary focus-visible:outline-none focus-visible:bg-muted"
        >
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
      {expanded && (
        <div className="ml-2 flex flex-col gap-1 border-l border-border pb-2 pl-3">
          {isLoading && <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">Loading categories…</p>}
          {isError && <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">Couldn't load categories.</p>}
          {!isLoading && !isError && !hasCategories && (
            <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">No categories yet.</p>
          )}
          {hasCategories &&
            categories!.map((category) => (
              <div key={category.id}>
                <Link to={categoryHref(category.slug)} onClick={onNavigate} className="block rounded-md px-2 py-2 text-sm font-bold text-primary hover:bg-muted">
                  {category.name}
                </Link>
                {category.subcategories.length > 0 && (
                  <div className="ml-3 flex flex-col">
                    {category.subcategories.map((sub) => (
                      <Link key={sub.id} to={categoryHref(sub.slug)} onClick={onNavigate} className="block rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
