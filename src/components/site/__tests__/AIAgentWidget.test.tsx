import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// These assertions cover the accessibility contract that is easy to regress silently:
// the disclosure wiring, the always-mounted panel, focus return on close, and the
// deliberate `aria-live="off"` on the transcript that stops the whole history being
// announced on open.

const send = vi.fn();
const mockConversation = {
  messages: [] as unknown[],
  send,
  retry: vi.fn(),
  reset: vi.fn(),
  isSending: false,
  error: null as unknown,
  conversationId: null,
  conversationState: "greeting",
  lastIntent: null,
  hasEnded: false,
};

vi.mock("@/hooks/useAIConversation", () => ({
  useAIConversation: () => mockConversation,
}));

// Imported after vi.mock above, which vitest hoists.
import { AIAgentWidget } from "@/components/site/AIAgentWidget";

describe("AIAgentWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversation.messages = [];
    mockConversation.error = null;
    mockConversation.isSending = false;

    // jsdom implements neither of these; every real browser does. Stubbed here rather
    // than guarded in the component, which would be noise for a test-env-only gap.
    Element.prototype.scrollIntoView = vi.fn();
    if (typeof window.matchMedia !== "function") {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    }
  });

  function getPanel() {
    // Queried by id rather than role: while `hidden`, the section is correctly
    // absent from the accessibility tree, which is the behaviour being asserted.
    const launcher = screen.getByRole("button", { name: /open ai assistant/i });
    const panelId = launcher.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    return document.getElementById(panelId ?? "");
  }

  it("renders the panel in the DOM while closed, but hidden", () => {
    render(<AIAgentWidget />);

    const launcher = screen.getByRole("button", { name: /open ai assistant/i });
    expect(launcher).toHaveAttribute("aria-expanded", "false");

    // aria-controls must reference a node that exists even when closed.
    const panel = getPanel();
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("hidden");
  });

  it("opens on click, moves focus to the composer, and exposes the panel", async () => {
    const user = userEvent.setup();
    render(<AIAgentWidget />);

    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const panel = document.querySelector("section[aria-labelledby]");
    expect(panel).not.toHaveAttribute("hidden");
    // The launcher says "Hide", the panel header says "Close" — deliberately distinct,
    // so the two controls are not ambiguous in a screen reader's button list.
    expect(screen.getByRole("button", { name: /hide ai assistant/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /close ai assistant/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/message the skill guru assistant/i)).toHaveFocus();
    });
  });

  it("keeps the transcript out of the live-region path", async () => {
    const user = userEvent.setup();
    render(<AIAgentWidget />);
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const log = screen.getByRole("log");
    // Explicit "off" overrides the implicit polite on role=log. Without this the
    // entire history is announced on open and the user's own message is echoed back.
    expect(log).toHaveAttribute("aria-live", "off");
    expect(log).toHaveAttribute("tabindex", "0");
    // Lenis is global with no `prevent` option and would hijack wheel events here.
    expect(log).toHaveAttribute("data-lenis-prevent");
  });

  it("closes on Escape and returns focus to the launcher", async () => {
    const user = userEvent.setup();
    render(<AIAgentWidget />);

    const launcher = screen.getByRole("button", { name: /open ai assistant/i });
    await user.click(launcher);

    // Escape is handled on the panel, not on document, so focus must actually be
    // inside the panel before the key is sent or the event never reaches the handler.
    await waitFor(() => {
      expect(screen.getByLabelText(/message the skill guru assistant/i)).toHaveFocus();
    });
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /open ai assistant/i })).toHaveFocus();
    });
    expect(document.querySelector("section[aria-labelledby]")).toHaveAttribute("hidden");
  });

  it("preserves an unsent draft across close and reopen", async () => {
    const user = userEvent.setup();
    render(<AIAgentWidget />);

    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));
    await user.type(screen.getByLabelText(/message the skill guru assistant/i), "what does it cost");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));

    // The panel is toggled with `hidden` rather than unmounted precisely so this
    // holds — which is what makes unconditional Escape-to-close safe.
    expect(screen.getByLabelText(/message the skill guru assistant/i)).toHaveValue("what does it cost");
  });

  it("sends on Enter and not on Shift+Enter", async () => {
    const user = userEvent.setup();
    render(<AIAgentWidget />);
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const input = screen.getByLabelText(/message the skill guru assistant/i);
    await user.type(input, "hello{Shift>}{Enter}{/Shift}");
    expect(send).not.toHaveBeenCalled();

    await user.type(input, "{Enter}");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toContain("hello");
  });

  it("announces a rate limit once and keeps the ticking countdown out of the live region", async () => {
    mockConversation.error = { code: "RATE_LIMITED", message: "Too many messages.", retryAfterSeconds: 30 };
    const user = userEvent.setup();
    render(<AIAgentWidget />);
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/too many messages/i);

    // A per-second counter inside a live region would announce every tick.
    const countdown = screen.getByText(/try again in/i);
    expect(countdown).toHaveAttribute("aria-hidden", "true");
  });
});
