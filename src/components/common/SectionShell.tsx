import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionTone = "light" | "dark" | "white";

export function SectionShell({
  children,
  className,
  innerClassName,
  tone = "light",
}: Readonly<{
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  tone?: SectionTone;
}>) {
  return (
    <section
      className={cn(
        "relative py-10 sm:py-16 lg:py-24",
        tone === "light" && "bg-[#F8FAFF]",
        tone === "white" && "bg-white",
        tone === "dark" && "bg-[#111E79] text-white",
        className,
      )}
    >
      <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8", innerClassName)}>{children}</div>
    </section>
  );
}
