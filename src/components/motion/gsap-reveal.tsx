
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealDirection = "up" | "left" | "right" | "scale";

interface GsapRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly stagger?: boolean;
  readonly direction?: RevealDirection;
  readonly delay?: number;
  readonly duration?: number;
}

function getFromVars(direction: RevealDirection) {
  const base = { autoAlpha: 0, filter: "blur(8px)" };

  switch (direction) {
    case "up":
      return { ...base, y: 34 };
    case "left":
      return { ...base, x: 40 };
    case "right":
      return { ...base, x: -40 };
    case "scale":
      return { ...base, scale: 0.92 };
  }
}

function getToVars(direction: RevealDirection) {
  const base = { autoAlpha: 1, filter: "blur(0px)" };

  switch (direction) {
    case "up":
      return { ...base, y: 0 };
    case "left":
      return { ...base, x: 0 };
    case "right":
      return { ...base, x: 0 };
    case "scale":
      return { ...base, scale: 1 };
  }
}

function getEase(direction: RevealDirection) {
  return direction === "up" ? "power3.out" : "power2.out";
}

export function GsapReveal({
  children,
  className,
  stagger = false,
  direction = "up",
  delay = 0,
  duration = 0.8,
}: GsapRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    let ctx: { revert: () => void } | undefined;
    let disposed = false;

    if (!element) {
      return;
    }

    const revealElement = element;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    async function animate() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (disposed) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        gsap.fromTo(
          stagger ? revealElement.children : revealElement,
          getFromVars(direction),
          {
            ...getToVars(direction),
            duration,
            delay,
            ease: getEase(direction),
            stagger: stagger ? 0.1 : 0,
            scrollTrigger: {
              trigger: revealElement,
              start: "top 82%",
              once: true,
            },
          },
        );
      }, revealElement);
    }

    void animate();

    return () => {
      disposed = true;
      ctx?.revert();
    };
  }, [stagger, direction, delay, duration]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
