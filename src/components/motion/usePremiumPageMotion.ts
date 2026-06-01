import { useEffect, type RefObject } from "react";

type PremiumPageMotionOptions = {
  readonly rootRef: RefObject<HTMLElement | null>;
  readonly revealSelector?: string;
  readonly cardSelector?: string;
  readonly magneticSelector?: string;
  readonly parallaxSelector?: string;
};

export function usePremiumPageMotion({
  rootRef,
  revealSelector = ".premium-reveal",
  cardSelector = ".premium-card-motion",
  magneticSelector = ".premium-magnetic",
  parallaxSelector = ".premium-parallax",
}: PremiumPageMotionOptions) {
  useEffect(() => {
    const root = rootRef.current;

    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const targetRoot = root;
    let cleanup: (() => void) | undefined;
    let disposed = false;

    async function run() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);

      if (disposed) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(revealSelector).forEach((element) => {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 28, filter: "blur(10px)" },
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.78,
              ease: "power3.out",
              scrollTrigger: { trigger: element, start: "top 86%", once: true },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>(cardSelector).forEach((element) => {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 24, scale: 0.97 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: { trigger: element, start: "top 88%", once: true },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>(parallaxSelector).forEach((element) => {
          gsap.to(element, {
            yPercent: -8,
            ease: "none",
            scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 0.8 },
          });
        });
      }, targetRoot);

      const magneticCleanups = gsap.utils.toArray<HTMLElement>(magneticSelector, targetRoot).map((element) => {
        const handleMove = (event: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const x = event.clientX - (rect.left + rect.width / 2);
          const y = event.clientY - (rect.top + rect.height / 2);
          gsap.to(element, { x: x * 0.12, y: y * 0.16, duration: 0.35, ease: "power3.out" });
        };

        const handleLeave = () => {
          gsap.to(element, { x: 0, y: 0, duration: 0.45, ease: "elastic.out(1, 0.5)" });
        };

        element.addEventListener("mousemove", handleMove);
        element.addEventListener("mouseleave", handleLeave);

        return () => {
          element.removeEventListener("mousemove", handleMove);
          element.removeEventListener("mouseleave", handleLeave);
        };
      });

      cleanup = () => {
        magneticCleanups.forEach((dispose) => dispose());
        ctx.revert();
      };
    }

    void run();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [cardSelector, magneticSelector, parallaxSelector, revealSelector, rootRef]);
}
