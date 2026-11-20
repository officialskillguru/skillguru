import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStep = { id: string; label: string; shortLabel: string };

/**
 * Step navigation: an ordered list of buttons. The current step carries
 * aria-current="step"; status ("has errors", "visited") is spoken text, not
 * colour alone. Students may jump to any step — drafts can be incomplete.
 */
export function WizardStepper({ steps, current, visited, errorSteps, onSelect }: { steps: WizardStep[]; current: number; visited: Set<number>; errorSteps: Set<number>; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="Resume steps" className="-mx-1 overflow-x-auto pb-1">
      <p className="sr-only">
        Step {current + 1} of {steps.length}: {steps[current]?.label}
      </p>
      <ol className="flex min-w-max gap-1 px-1 lg:min-w-0 lg:flex-col">
        {steps.map((step, index) => {
          const isCurrent = index === current;
          const hasErrors = errorSteps.has(index);
          const status = hasErrors ? ", has errors" : visited.has(index) && !isCurrent ? ", visited" : "";
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:text-sm",
                  isCurrent ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                    isCurrent ? "border-primary-foreground/60" : hasErrors ? "border-destructive text-destructive-text" : "border-border",
                  )}
                >
                  {hasErrors ? "!" : visited.has(index) && !isCurrent ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span>
                  <span className="lg:hidden">{step.shortLabel}</span>
                  <span className="hidden lg:inline">{step.label}</span>
                  <span className="sr-only">{status}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
