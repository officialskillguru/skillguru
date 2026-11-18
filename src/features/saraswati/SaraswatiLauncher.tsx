import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

// The ElevenLabs SDK and three.js only load once the visitor opens Saraswati.
const SaraswatiPanel = lazy(() => import("./SaraswatiPanel").then((m) => ({ default: m.SaraswatiPanel })));

/** Homepage floating launcher for Saraswati — replaces the text AIAgentWidget launcher. */
export function SaraswatiLauncher() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const openPanel = useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);
  const closePanel = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closePanel();
    }
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Hide Saraswati" : "Talk to Saraswati, SkillGuru's voice guide"}
        className={cn(buttonVariants(), "fixed bottom-4 right-4 z-40 h-14 gap-2 rounded-full px-4 shadow-lg")}
      >
        {open ? <X aria-hidden="true" className="size-6" /> : <Sparkles aria-hidden="true" className="size-5" />}
        {!open && <span className="hidden text-sm font-semibold sm:inline">Saraswati</span>}
      </button>

      <section
        id={panelId}
        hidden={!open}
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="fixed bottom-20 right-4 z-40 flex max-h-[85svh] w-[calc(100vw-2rem)] flex-col overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-xl sm:w-96"
        data-lenis-prevent
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 id={titleId} className="text-sm font-semibold">
              Saraswati
            </h2>
            <p className="text-xs text-muted-foreground">SkillGuru's AI voice guide</p>
          </div>
          <button ref={closeRef} type="button" onClick={closePanel} aria-label="Close Saraswati" className={cn(buttonVariants({ variant: "ghost" }), "size-11 rounded-lg p-0")}>
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        {mounted && (
          <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 aria-hidden="true" className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" /><span className="sr-only">Loading Saraswati…</span></div>}>
            <SaraswatiPanel active={open} intro="Ask about courses, careers or how SkillGuru works — just speak." />
          </Suspense>
        )}
      </section>
    </>
  );
}
