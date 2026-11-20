// ============================================================================
// Debounced autosave with optimistic concurrency.
// ============================================================================
// - Changes are batched: a save fires `delayMs` after the last edit, never per
//   keystroke, and identical snapshots are skipped.
// - Saves are serialised; edits made while a save is in flight are saved next.
// - Every save carries the last known revision. If another tab/device saved
//   first, the hook enters "conflict" and stops saving until the student
//   chooses to reload the newer copy or keep (re-apply) their own changes.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { ResumeConflictError, saveResume, toFriendlyResumeError, type ResumeDetail, type SaveResumePatch } from "@/services/resumes.service";

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error" | "conflict";

type Options = {
  resumeId: string;
  initialRevision: number;
  delayMs?: number;
  onSaved?: (detail: ResumeDetail) => void;
};

export function useResumeAutosave({ resumeId, initialRevision, delayMs = 1500, onSaved }: Options) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ResumeDetail | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const revisionRef = useRef(initialRevision);
  const pendingRef = useRef<SaveResumePatch | null>(null);
  const lastSavedJsonRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const blockedRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    revisionRef.current = initialRevision;
  }, [resumeId, initialRevision]);

  const runSave = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) {
      await inFlightRef.current;
    }
    const patch = pendingRef.current;
    if (!patch || blockedRef.current) return !patch;
    const json = JSON.stringify(patch);
    if (json === lastSavedJsonRef.current) {
      pendingRef.current = null;
      setStatus("saved");
      return true;
    }

    pendingRef.current = null;
    setStatus("saving");
    setErrorMessage(null);
    const attempt = (async () => {
      try {
        const saved = await saveResume(resumeId, revisionRef.current, patch);
        revisionRef.current = saved.revision;
        lastSavedJsonRef.current = json;
        setLastSavedAt(new Date());
        onSavedRef.current?.(saved);
        setStatus(pendingRef.current ? "unsaved" : "saved");
        return true;
      } catch (error) {
        // Keep the unsaved snapshot so nothing typed is lost.
        pendingRef.current = pendingRef.current ?? patch;
        if (error instanceof ResumeConflictError) {
          blockedRef.current = true;
          setConflict(error.latest);
          setStatus("conflict");
        } else {
          setErrorMessage(toFriendlyResumeError(error, "Your changes could not be saved. Please try again.").message);
          setStatus("error");
        }
        return false;
      }
    })();
    inFlightRef.current = attempt;
    const ok = await attempt;
    inFlightRef.current = null;
    if (ok && pendingRef.current && !blockedRef.current) return runSave();
    return ok;
  }, [resumeId]);

  const schedule = useCallback(
    (patch: SaveResumePatch) => {
      pendingRef.current = patch;
      if (blockedRef.current) return;
      setStatus("unsaved");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void runSave();
      }, delayMs);
    },
    [delayMs, runSave],
  );

  /** Saves immediately (Save Draft / Next step / leaving the page). Resolves true when everything is saved. */
  const flush = useCallback(
    async (patch?: SaveResumePatch): Promise<boolean> => {
      if (patch) pendingRef.current = patch;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (blockedRef.current) return false;
      return runSave();
    },
    [runSave],
  );

  /** "reload": adopt the newer saved copy (caller resets its form). "keep-mine": overwrite it with the local edits. */
  const resolveConflict = useCallback(
    async (choice: "reload" | "keep-mine"): Promise<ResumeDetail | null> => {
      const latest = conflict;
      if (!latest) return null;
      revisionRef.current = latest.revision;
      blockedRef.current = false;
      setConflict(null);
      if (choice === "reload") {
        pendingRef.current = null;
        lastSavedJsonRef.current = null;
        setStatus("saved");
        return latest;
      }
      lastSavedJsonRef.current = null;
      await runSave();
      return null;
    },
    [conflict, runSave],
  );

  /** Marks a snapshot as already persisted (e.g. right after loading) so it is not re-saved. */
  const markSaved = useCallback((patch: SaveResumePatch, revision: number) => {
    lastSavedJsonRef.current = JSON.stringify(patch);
    revisionRef.current = revision;
    pendingRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return {
    status,
    errorMessage,
    conflict,
    lastSavedAt,
    schedule,
    flush,
    resolveConflict,
    markSaved,
    getRevision: () => revisionRef.current,
    hasUnsavedChanges: () => pendingRef.current !== null || status === "saving",
  };
}
