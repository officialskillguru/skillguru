import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown, Menu, Search, UserRound } from "lucide-react";

import { Drawer } from "@/components/common/Drawer";
import { Logo } from "@/components/common/Logo";
import { assetUrl } from "@/lib/asset-url";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useSearch } from "@/features/search";
import { useAuth } from "@/hooks/useAuth";
import { RouteResolver } from "@/routes/RouteResolver";

const navItems = [
  {
    label: "Courses",
    to: routes.courses,
    dropdown: ["Development", "Data Science & AI", "Cloud Computing", "UI/UX Design", "Cyber Security"],
  },
  { label: "Placements", to: routes.placements },
  { label: "Mentors", to: routes.mentors },
  { label: "AI Guidance", to: routes.guidance },
  { label: "About Us", to: routes.about },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { openSearch } = useSearch();
  const auth = useAuth();
  
  const dashboardPath = RouteResolver.getDashboard(auth.authUser);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const element = headerRef.current;

    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let disposed = false;

    async function run() {
      const { default: gsap } = await import("gsap");
      if (disposed) {
        return;
      }

      const ctx = gsap.context(() => {
        gsap.fromTo(element, { autoAlpha: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: 0.65, ease: "power3.out" });
      });
      cleanup = () => ctx.revert();
    }

    void run();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-secondary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-secondary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <header
        ref={headerRef}
        data-scrolled={scrolled || undefined}
        className={cn(
          "sticky top-0 z-40 border-b border-transparent bg-transparent transition-all duration-300",
          scrolled && "border-border/50 bg-background/80 shadow-md backdrop-blur-xl",
        )}
      >
        <div className="mx-auto flex h-[72px] lg:h-[80px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo
            src={assetUrl("/assets/logo/official-skill-guru-navbar.png")}
            imageClassName="h-10 md:h-12"
          />
          <nav className="hidden items-center gap-5 xl:gap-7 lg:flex">
            {navItems.map((item) => (
              <div key={`${item.label}-${item.to}`} className="group relative">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "nav-link-premium inline-flex h-10 items-center gap-1 whitespace-nowrap text-sm font-bold text-primary transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-2",
                      isActive && "text-secondary",
                    )
                  }
                >
                  {item.label}
                  {item.dropdown ? <ChevronDown className="size-3.5" /> : null}
                </NavLink>
                {item.dropdown ? (
                  <div className="invisible absolute left-1/2 top-full z-30 min-w-60 -translate-x-1/2 pt-3 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100">
                    <div className="rounded-xl border border-border bg-card p-2 shadow-lg">
                      {item.dropdown.map((label) => (
                        <Link key={label} to={item.to} className="block rounded-md px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-secondary focus-visible:outline-none focus-visible:bg-muted focus-visible:text-secondary">
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <button 
              type="button" 
              onClick={() => openSearch()}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Search"
            >
              <Search className="size-4.5" />
            </button>
            {auth.isReady ? (
              <Link 
                to={dashboardPath} 
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-bold text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Dashboard
              </Link>
            ) : (
              <Link 
                to={routes.login} 
                className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-secondary hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Login"
              >
                <UserRound className="size-4.5" />
              </Link>
            )}
            <Link
              to={routes.freeCounselling}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-5 text-sm font-bold text-accent-foreground shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Book Free Counselling
            </Link>
          </div>
          <button 
            type="button" 
            className="rounded-md border border-border p-2 text-primary lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
            onClick={() => setOpen(true)} 
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <Logo className="mt-3" src={assetUrl("/assets/logo/official-skill-guru-navbar.png")} imageClassName="h-9" />
        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link key={`${item.label}-${item.to}`} to={item.to} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-md px-4 py-3 text-base font-bold text-primary hover:bg-muted focus-visible:outline-none focus-visible:bg-muted">
              {item.label}
              {item.dropdown ? <ChevronDown className="size-4" /> : null}
            </Link>
          ))}
          {auth.isReady ? (
            <Link to={dashboardPath} onClick={() => setOpen(false)} className="mt-2 rounded-md px-4 py-3 text-base font-bold text-primary hover:bg-muted focus-visible:outline-none focus-visible:bg-muted">
              Dashboard
            </Link>
          ) : (
            <Link to={routes.login} onClick={() => setOpen(false)} className="mt-2 rounded-md px-4 py-3 text-base font-bold text-primary hover:bg-muted focus-visible:outline-none focus-visible:bg-muted">
              Login
            </Link>
          )}
          <Link
            to={routes.freeCounselling}
            onClick={() => setOpen(false)}
            className="mt-4 rounded-md bg-accent px-4 py-3 text-center text-base font-bold text-accent-foreground hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Book Free Counselling
          </Link>
        </nav>
      </Drawer>
    </>
  );
}
