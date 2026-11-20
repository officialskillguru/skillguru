import { useRef, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SaveStatus } from "../hooks/useResumeAutosave";

export const dialogMotionClass = "max-h-[90vh] overflow-y-auto motion-reduce:animate-none";

/** Destructive/irreversible confirmation with alertdialog semantics; initial focus on Cancel. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  destructive = true,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
  children?: ReactNode;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent
        role="alertdialog"
        className={dialogMotionClass}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2">
          <Button ref={cancelRef} variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
  conflict: "Not saved: changed elsewhere",
};

/**
 * Persistent polite status region. "Saving…" is not announced (it would chatter);
 * screen readers hear "Saved" / "Unsaved changes". Failures use role="alert".
 */
export function SaveStatusIndicator({ status, errorMessage, lastSavedAt, onRetry }: { status: SaveStatus; errorMessage: string | null; lastSavedAt: Date | null; onRetry: () => void }) {
  const icon =
    status === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> :
    status === "error" || status === "conflict" ? <CloudOff className="size-4" aria-hidden="true" /> :
    status === "unsaved" ? <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" /> :
    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
      {icon}
      <span role="status" aria-live="polite">
        {status === "saving" ? <span aria-hidden="true">{STATUS_TEXT.saving}</span> : status === "error" ? null : STATUS_TEXT[status]}
        {status === "saved" && lastSavedAt && (
          <span className="sr-only"> at {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        )}
      </span>
      {status === "error" && (
        <span role="alert" className="flex items-center gap-2 text-destructive-text">
          {errorMessage ?? "Your changes could not be saved."}
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry save
          </Button>
        </span>
      )}
    </div>
  );
}

export function ConflictBanner({ onReload, onKeepMine, busy }: { onReload: () => void; onKeepMine: () => void; busy?: boolean }) {
  return (
    <div role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-black text-foreground">This resume was changed in another tab or device</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your recent edits have not been saved. Load the latest saved version (your unsaved edits here will be discarded), or keep your changes and overwrite the other version.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onReload} disabled={busy}>
              Load latest version
            </Button>
            <Button size="sm" onClick={onKeepMine} disabled={busy}>
              Keep my changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Visually hidden polite announcer for list moves, chip adds, etc. */
export function LiveAnnouncer({ message }: { message: string }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {message}
    </p>
  );
}
