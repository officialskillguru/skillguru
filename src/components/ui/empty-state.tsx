import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** Heading level for the title, so callers can keep a valid heading outline in whatever context this renders. Defaults to h3. */
  headingLevel?: 2 | 3 | 4;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  headingLevel = 3,
  ...props
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8 text-center animate-in fade-in-50 duration-500",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          {icon}
        </div>
      )}

      <Heading className="mb-2 text-xl font-bold text-foreground">{title}</Heading>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
