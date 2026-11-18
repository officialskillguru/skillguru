import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Disclosure for static sample content (src/data/platform.ts): success stories,
 * headline figures and profiles that are not verified production records.
 * Remove a page's notice only once its content is replaced with verified data.
 */
export function IllustrativeContentNotice({ children, className }: Readonly<{ children?: React.ReactNode; className?: string }>) {
  return (
    <aside
      aria-label="About this content"
      className={cn("mx-auto flex max-w-7xl items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950", className)}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-bold">Illustrative examples. </span>
        {children ?? "The stories, figures and profiles in this section are sample content for this preview and are not verified placement records."}
      </p>
    </aside>
  );
}
