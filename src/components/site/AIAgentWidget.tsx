import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AlertCircle, Loader2, MessageSquare, Send, X } from "lucide-react";

import { AgentCitations } from "@/components/site/AgentCitations";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useAIConversation } from "@/hooks/useAIConversation";
import { cn } from "@/lib/utils";
import type { AgentError } from "@/services/ai-conversation.service";

// ============================================================================
// AI sales-agent chat widget — Phase 2.6
// ============================================================================
// Non-modal disclosure, NOT a Dialog. `ui/dialog.tsx`/`ui/sheet.tsx` hardcode a
// full-screen `bg-black/80` scrim inside their Content, and Radix Dialog with
// `modal={false}` still closes on outside pointerdown — which would discard a
// half-typed message every time the visitor clicked the page behind it.
//
// The panel is always mounted and toggled with the `hidden` attribute rather
// than conditionally rendered: `aria-controls` must point at a node that exists
// while closed, `hidden` removes it from the a11y tree and tab order for free,
// and keeping it mounted preserves the draft + transcript across close/reopen
// (which is what makes unconditional Escape-to-close safe).
//
// It stays non-modal at every breakpoint — on small screens it insets rather
// than going full-screen, so the page behind remains genuinely usable and the
// non-modal semantics stay honest.
// ============================================================================

const THINKING_ANNOUNCEMENT = "Assistant is thinking. This can take up to 30 seconds.";

/**
 * `matchMedia` is absent in jsdom and in any non-browser render path, where an
 * unguarded call throws during the scroll effect. Absence is treated as "motion
 * is fine" — the same default a browser without the media query would give.
 */
function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Seconds of rate-limit cooldown an error implies, or 0 if it is not a rate limit. */
function cooldownFor(error: AgentError | null): number {
  return error?.code === "RATE_LIMITED" ? (error.retryAfterSeconds ?? 0) : 0;
}

export function AIAgentWidget() {
  const { messages, send, retry, isSending, error, hasEnded } = useAIConversation();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  // Lazily seeded from the initial error too, not only from later changes — otherwise
  // an error already present on the first render would never start the countdown.
  const [cooldownSeconds, setCooldownSeconds] = useState(() => cooldownFor(error));

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const hintId = useId();
  const errorId = useId();

  /**
   * Writes to the polite status region.
   *
   * Clears first and sets on the next frame so two identical consecutive
   * announcements still produce a DOM change — otherwise React renders nothing
   * and the screen reader stays silent.
   */
  const announce = useCallback((text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);

  // Rate-limit cooldown. The visible number is aria-hidden (see below); a live
  // region containing a per-second counter would announce every single tick.
  //
  // Seeded during render on the identity change of `error` rather than from an
  // effect: syncing state to a prop in an effect body causes a cascading render
  // (react-hooks/set-state-in-effect), and this is the adjust-state-during-render
  // pattern React documents for exactly this case.
  const [trackedError, setTrackedError] = useState(error);
  if (error !== trackedError) {
    setTrackedError(error);
    const seconds = cooldownFor(error);
    if (seconds > 0) setCooldownSeconds(seconds);
  }

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldownSeconds((seconds) => {
        const next = seconds - 1;
        if (next === 0) announce("You can send again now.");
        return next;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds, announce]);

  // Auto-scroll to the newest turn. Branches on reduced motion — an unguarded
  // smooth scroll is a vestibular trigger.
  useEffect(() => {
    if (!open) return;
    transcriptEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "end" });
  }, [messages, isSending, open]);

  const openPanel = useCallback(() => {
    setOpen(true);
    announce("AI assistant opened. Ask about courses, pricing, or careers.");
    // Focus the composer rather than the panel: the visitor's next action is
    // always typing, and the status region above supplies the panel context that
    // focusing an input alone would not read.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [announce]);

  const closePanel = useCallback(() => {
    setOpen(false);
    // Deterministic return target, set here rather than in an effect cleanup so
    // it fires only on real closes.
    launcherRef.current?.focus();
  }, []);

  const isRateLimited = cooldownSeconds > 0;
  const canSend = draft.trim().length > 0 && !isSending && !isRateLimited;

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const text = draft;
    setDraft("");
    announce(THINKING_ANNOUNCEMENT);

    await send(text);
    // Focus is intentionally left in the composer — never moved to the reply.
    // Stealing focus 2-25s after the visitor moved on is hostile.
  }, [canSend, draft, send, announce]);

  // Announce the reply once it lands, including a source count but never the
  // sources themselves.
  const lastMessage = messages[messages.length - 1];
  const lastAssistantId = lastMessage?.role === "assistant" ? lastMessage.id : null;
  const announcedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastAssistantId || announcedIdRef.current === lastAssistantId) return;
    announcedIdRef.current = lastAssistantId;

    const sourceCount = lastMessage?.citations?.length ?? 0;
    const suffix = sourceCount > 0 ? ` ${sourceCount} ${sourceCount === 1 ? "source" : "sources"}.` : "";
    announce(`Assistant said: ${lastMessage?.content ?? ""}.${suffix}`);
  }, [lastAssistantId, lastMessage, announce]);

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  // Escape is bound to the panel, not to `document` — a document-level listener
  // on a non-modal widget swallows Escape from popovers, dropdowns and the
  // command palette on the page behind it.
  function handlePanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closePanel();
    }
  }

  return (
    <>
      {/* Single polite status region, always mounted. All async announcement flows
          through here; the transcript itself is aria-live="off". */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Native button rather than <Button>: the shared component types its props as
          ButtonHTMLAttributes, which carries no `ref`. buttonVariants supplies the
          same styling and the focus-visible ring — which the offset-2 makes visible
          at all, since --ring and --primary are the same blue. */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        aria-controls={panelId}
        // "Hide", not "Close" — the panel header has its own close button, and two
        // controls with identical accessible names are ambiguous when navigating by
        // button list.
        aria-label={open ? "Hide AI assistant" : "Open AI assistant"}
        className={cn(buttonVariants(), "fixed bottom-4 right-4 z-40 size-14 rounded-full p-0 shadow-lg")}
      >
        {open ? <X aria-hidden="true" className="size-6" /> : <MessageSquare aria-hidden="true" className="size-6" />}
      </button>

      <section
        id={panelId}
        hidden={!open}
        aria-labelledby={titleId}
        onKeyDown={handlePanelKeyDown}
        className="fixed bottom-20 right-4 z-40 flex max-h-[85svh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl sm:w-96"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold">
            Skill Guru assistant
          </h2>
          <Button
            type="button"
            variant="ghost"
            onClick={closePanel}
            aria-label="Close AI assistant"
            className="size-11 rounded-lg p-0"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <div
          role="log"
          aria-live="off"
          aria-label="Conversation transcript"
          aria-busy={isSending}
          tabIndex={0}
          // Lenis is instantiated globally with no `prevent` option and would
          // otherwise hijack wheel events over this nested scroll container.
          data-lenis-prevent
          className="flex-1 overflow-y-auto px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask about our courses, pricing, mentors, or career paths.
            </p>
          ) : (
            <ol className="space-y-3">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <li
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                      isUser
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-muted text-foreground",
                      message.status === "failed" && "opacity-60"
                    )}
                  >
                    <span className="sr-only">{isUser ? "You said:" : "Assistant said:"}</span>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    {!isUser && message.citations ? <AgentCitations citations={message.citations} /> : null}
                  </li>
                );
              })}

              {isSending ? (
                <li className="mr-auto flex max-w-[85%] items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                  {/* Real text, not animation alone — a bare spinner is invisible to
                      screen readers and to reduced-motion users. */}
                  <span>Assistant is thinking…</span>
                </li>
              ) : null}
            </ol>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {error ? (
          <div
            id={errorId}
            role="alert"
            className="flex flex-wrap items-center gap-1.5 border-t border-border px-4 py-2 text-xs"
          >
            <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-destructive-text" />
            <span className="text-destructive-text">
              {error.code === "RATE_LIMITED" ? "Too many messages just now." : error.message}
            </span>
            {isRateLimited ? (
              // aria-hidden: the ticking number must never sit in a live region.
              <span aria-hidden="true" className="text-muted-foreground">
                Try again in {cooldownSeconds}s
              </span>
            ) : (
              <Button type="button" variant="link" onClick={() => void retry()} className="text-xs">
                Retry sending your message
              </Button>
            )}
          </div>
        ) : null}

        <div className="border-t border-border p-3">
          <label htmlFor={`${panelId}-input`} className="sr-only">
            Message the Skill Guru assistant
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleInputKeyDown}
              rows={2}
              maxLength={4000}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
              placeholder={hasEnded ? "Start a new question…" : "Type your question…"}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            />
            <Button
              type="button"
              onClick={() => void handleSend()}
              // aria-disabled rather than disabled while rate-limited: a hard
              // `disabled` would remove the element that explains the block.
              aria-disabled={!canSend}
              aria-busy={isSending}
              aria-describedby={isRateLimited ? errorId : undefined}
              aria-label="Send message"
              className={cn("size-11 rounded-lg p-0", !canSend && "opacity-50")}
            >
              {isSending ? (
                <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Send aria-hidden="true" className="size-5" />
              )}
            </Button>
          </div>
          <p id={hintId} className="sr-only">
            Press Enter to send, Shift plus Enter for a new line.
          </p>
        </div>
      </section>
    </>
  );
}
