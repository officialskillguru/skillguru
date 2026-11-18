import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Navbar/Footer pull in auth, search and data providers that are irrelevant here.
vi.mock("@/components/site/Navbar", () => ({ Navbar: () => <nav aria-label="Main" /> }));
vi.mock("@/components/site/Footer", () => ({ Footer: () => <footer /> }));
// If the old Gemini text chatbot is ever re-mounted, make it loudly visible to this test.
vi.mock("@/components/site/AIAgentWidget", () => ({
  AIAgentWidget: () => <button type="button">Open AI assistant</button>,
}));

import { MarketingLayout } from "@/layouts/MarketingLayout";

describe("MarketingLayout chat launcher", () => {
  it("mounts exactly one assistant launcher: Saraswati (ElevenLabs voice), not the old text chatbot", () => {
    render(
      <MemoryRouter>
        <MarketingLayout>
          <p>page</p>
        </MarketingLayout>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("button", { name: /Talk to Saraswati/i })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Open AI assistant/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Skill Guru assistant/i)).not.toBeInTheDocument();
  });
});
