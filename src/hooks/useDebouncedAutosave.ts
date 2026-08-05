import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Debounces a value into a single save call, with a status suitable for a
 * "Saving… / Saved / Save failed" indicator. If newer values arrive while a
 * save is already in flight, they're saved immediately after the current one
 * finishes (loop, not recursion) rather than dropped. On failure the pending
 * value is left in place (not cleared) so Retry - or the next debounced edit -
 * has something real to send, instead of silently reporting "saved".
 */
export function useDebouncedAutosave<T>(save: (value: T) => Promise<unknown>, delayMs = 1000) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<T | null>(null);
  const savingRef = useRef(false);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const flush = useCallback(async () => {
    clearTimer();
    if (savingRef.current || pendingValueRef.current === null) return;

    while (pendingValueRef.current !== null) {
      const value: T = pendingValueRef.current;
      savingRef.current = true;
      setStatus("saving");
      try {
        await saveRef.current(value);
        savingRef.current = false;
        // Only clear if nothing newer was scheduled while this save was in flight.
        if (pendingValueRef.current === value) {
          pendingValueRef.current = null;
        }
      } catch (err) {
        savingRef.current = false;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Save failed.");
        return; // leave pendingValueRef in place so Retry has something to send
      }
    }

    setStatus("saved");
    setErrorMessage(null);
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pendingValueRef.current = value;
      setStatus("pending");
      clearTimer();
      timeoutRef.current = setTimeout(() => {
        void flush();
      }, delayMs);
    },
    [delayMs, flush]
  );

  useEffect(() => () => clearTimer(), []);

  const hasUnsavedWork = status === "pending" || status === "saving" || status === "error";

  return { status, errorMessage, schedule, flush, hasUnsavedWork };
}
