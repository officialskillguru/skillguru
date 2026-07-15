import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function CTAButton({
  to,
  children,
  variant = "primary",
  className,
}: Readonly<{
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}>) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-bold transition duration-300",
        variant === "primary" &&
          "bg-secondary text-white shadow-[0_18px_45px_rgba(17,71,255,0.24)] hover:-translate-y-1 hover:bg-primary",
        variant === "secondary" && "border border-secondary bg-white text-secondary hover:-translate-y-1 hover:bg-indigo-50",
        variant === "ghost" && "border border-white/20 bg-white/5 text-white hover:bg-white/10",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
