import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown, Menu, Search, UserRound } from "lucide-react";

import { Drawer } from "@/components/common/Drawer";
import { Logo } from "@/components/common/Logo";
import { assetUrl } from "@/lib/asset-url";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

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
      <header
        ref={headerRef}
        data-scrolled={scrolled || undefined}
        className={cn(
          "sticky top-0 z-40 border-b border-transparent bg-transparent transition-all duration-300",
          scrolled && "border-white/35 bg-white/78 shadow-[0_16px_46px_rgba(10,42,136,0.13)] backdrop-blur-[20px]",
        )}
      >
        <div className="mx-auto flex h-18 max-w-360 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo
            src={assetUrl("/assets/logo/hr-remedy-logo-new.png")}
            className="w-47.5 shrink-0 overflow-visible sm:w-55 lg:w-62.5"
            imageClassName="h-10 w-auto origin-left scale-[2.2] sm:h-[46px] lg:h-[52px]"
          />
          <nav className="hidden items-center gap-5 xl:gap-7 lg:flex">
            {navItems.map((item) => (
              <div key={`${item.label}-${item.to}`} className="group relative">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "nav-link-premium inline-flex h-10 items-center gap-1 whitespace-nowrap text-[14px] font-bold text-[#061B5C] transition hover:text-[#1147FF]",
                      isActive && "text-[#1147FF]",
                    )
                  }
                >
                  {item.label}
                  {item.dropdown ? <ChevronDown className="size-3.5" /> : null}
                </NavLink>
                {item.dropdown ? (
                  <div className="invisible absolute left-1/2 top-full z-30 min-w-60 -translate-x-1/2 pt-3 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100">
                    <div className="rounded-2xl border border-[#E5EAF5] bg-white p-2 shadow-[0_18px_60px_rgba(10,42,136,0.13)]">
                      {item.dropdown.map((label) => (
                        <Link key={label} to={item.to} className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-[#64748B] transition hover:bg-[#F1F5FF] hover:text-[#1147FF]">
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
          <div className="hidden items-center gap-2.5 lg:flex">
            <button type="button" className="grid size-10 place-items-center rounded-[13px] border border-[#E5EAF5] bg-white text-[#061B5C] shadow-[0_8px_22px_rgba(10,42,136,0.06)] transition hover:-translate-y-0.5 hover:border-[#1147FF] hover:text-[#1147FF]" aria-label="Search">
              <Search className="size-4.5" />
            </button>
            <Link to={routes.login} className="grid size-10 place-items-center rounded-[13px] border border-[#E5EAF5] bg-white text-[#061B5C] shadow-[0_8px_22px_rgba(10,42,136,0.06)] transition hover:-translate-y-0.5 hover:border-[#1147FF] hover:text-[#1147FF]" aria-label="Login">
              <UserRound className="size-4.5" />
            </Link>
            <Link
              to={routes.freeCounselling}
              className="inline-flex h-11 items-center gap-2 rounded-[13px] bg-[#19D9FF] px-4.5 text-[13px] font-black text-[#061B5C] shadow-[0_12px_28px_rgba(25,217,255,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#37E3FF]"
            >
              Book Free Counselling
            </Link>
          </div>
          <button type="button" className="rounded-md border border-[#E5EAF5] p-2.5 text-[#061B5C] lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <Logo className="mt-3" imageClassName="h-14" />
        <nav className="mt-10 grid gap-2">
          {navItems.map((item) => (
            <Link key={`${item.label}-${item.to}`} to={item.to} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-4 py-3 text-base font-bold text-[#061B5C] hover:bg-[#F1F5FF]">
              {item.label}
              {item.dropdown ? <ChevronDown className="size-4" /> : null}
            </Link>
          ))}
          <Link to={routes.login} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base font-bold text-[#061B5C] hover:bg-[#F1F5FF]">
            Login
          </Link>
          <Link
            to={routes.freeCounselling}
            onClick={() => setOpen(false)}
            className="mt-3 rounded-md bg-[#19D9FF] px-4 py-3 text-center text-base font-black text-[#061B5C]"
          >
            Book Free Counselling
          </Link>
        </nav>
      </Drawer>
    </>
  );
}
