import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { AutosaveStatus } from "@/hooks/useDebouncedAutosave";

export function SaveStatusIndicator({
  status,
  errorMessage,
  onRetry,
}: Readonly<{ status: AutosaveStatus; errorMessage?: string | null; onRetry?: () => void | Promise<void> }>) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold" aria-live="polite">
      {status === "pending" && <span className="text-muted-foreground">Unsaved changes</span>}
      {status === "saving" && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Saving…
        </span>
      )}
      {status === "saved" && (
        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <Check className="size-3.5" aria-hidden="true" />
          Saved
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1.5 text-destructive-text">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          {errorMessage ?? "Save failed"}
          {onRetry && (
            <button
              type="button"
              onClick={() => void onRetry()}
              className="underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              Retry
            </button>
          )}
        </span>
      )}
    </div>
  );
}
