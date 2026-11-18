import { lazy, Suspense, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { Mic, PhoneOff, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATE_LABELS, type SaraswatiState } from "./saraswati-state";
import { useSaraswati } from "./useSaraswati";

// three.js + the GLB are heavy — only fetched when a Saraswati panel actually renders.
const SaraswatiAvatar = lazy(() => import("./SaraswatiAvatar"));

/**
 * Screen-reader announcement. Turn-by-turn changes (listening / thinking / speaking)
 * are deliberately silent: they would talk over Saraswati's own voice.
 */
function announcementFor(state: SaraswatiState): string {
  // Constant for the whole live session, so a live region speaks it once on connect.
  if (state === "connecting") return "Connecting to Saraswati…";
  if (state === "listening" || state === "thinking" || state === "speaking") return "Connected. Saraswati is listening.";
  return "";
}

export interface SaraswatiPanelProps {
  /** Context line shown under the title, e.g. on the Career Guidance page. */
  intro?: string;
  className?: string;
  avatarClassName?: string;
  /** Ends the session when the panel unmounts or is hidden. */
  active?: boolean;
}

function SaraswatiPanelInner({ intro, className, avatarClassName, active = true }: SaraswatiPanelProps) {
  const { state, isActive, errorMessage, lines, start, stop, sendText, getOutputVolume } = useSaraswati();
  const transcriptId = useId();
  const typedId = useId();
  const logRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const announcement = announcementFor(state);

  const onSubmitTyped = (e: FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    sendText(typed.trim());
    setTyped("");
  };

  // Hiding the panel (or navigating away) must never leave the mic open.
  useEffect(() => {
    if (!active && isActive) stop();
  }, [active, isActive, stop]);
  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  const connecting = state === "connecting";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className={cn("relative overflow-hidden rounded-xl bg-gradient-to-b from-slate-900 to-slate-800", avatarClassName ?? "h-64")}>
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 aria-hidden="true" className="size-6 animate-spin text-white/70 motion-reduce:animate-none" /></div>}>
          <SaraswatiAvatar state={state} getOutputVolume={getOutputVolume} className="h-full w-full" />
        </Suspense>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              state === "speaking" && "bg-emerald-400",
              state === "listening" && "bg-sky-400",
              (state === "thinking" || state === "connecting") && "bg-amber-400",
              state === "idle" && "bg-slate-400",
              state === "error" && "bg-red-400",
            )}
          />
          {STATE_LABELS[state]}
        </span>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {intro && <p className="text-sm text-muted-foreground">{intro}</p>}

      {errorMessage && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text">
          {errorMessage}
        </p>
      )}

      {lines.length > 0 && (
        <div
          ref={logRef}
          id={transcriptId}
          role="log"
          // Off: the transcript mirrors speech the user is already hearing.
          aria-live="off"
          aria-label="Saraswati conversation transcript"
          tabIndex={0}
          data-lenis-prevent
          className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {lines.map((l) => (
            <p key={`${l.role}-${l.id}`}>
              <span className="font-semibold">{l.role === "user" ? "You: " : "Saraswati: "}</span>
              {l.text}
            </p>
          ))}
        </div>
      )}

      {(state === "listening" || state === "thinking" || state === "speaking") && (
        <form onSubmit={onSubmitTyped} className="flex gap-2">
          <label htmlFor={typedId} className="sr-only">
            Type a message to Saraswati
          </label>
          <input
            id={typedId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Prefer to type? Ask here…"
            maxLength={1000}
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" variant="outline" aria-label="Send typed message" className="size-11 p-0">
            <Send aria-hidden="true" className="size-4" />
          </Button>
        </form>
      )}

      {isActive ? (
        <Button type="button" variant="destructive" onClick={stop} className="h-11 gap-2">
          <PhoneOff aria-hidden="true" className="size-4" />
          End conversation
        </Button>
      ) : (
        // aria-disabled (not disabled) keeps keyboard focus on the button while connecting.
        <Button
          type="button"
          onClick={() => {
            if (!connecting) void start();
          }}
          aria-disabled={connecting}
          className="h-11 gap-2 aria-disabled:opacity-70"
        >
          {connecting ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <Mic aria-hidden="true" className="size-4" />}
          {state === "error" ? "Try again" : "Talk to Saraswati"}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">Voice preview · uses your microphone · powered by ElevenLabs</p>
    </div>
  );
}

/** Self-contained Saraswati voice panel (provider + avatar + controls). */
export function SaraswatiPanel(props: SaraswatiPanelProps) {
  return (
    <ConversationProvider>
      <SaraswatiPanelInner {...props} />
    </ConversationProvider>
  );
}
