import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The page's data hooks talk to Supabase; Saraswati must render independently of them.
vi.mock("@/hooks/student/useCareerGuidance", () => ({
  useCareerGuidanceReports: () => ({ data: [], isLoading: false, error: null }),
  useGenerateCareerGuidance: () => ({ mutate: vi.fn(), isPending: false }),
  useRecommendedCourses: () => ({ data: [] }),
}));
// WebGL/ElevenLabs are not available in jsdom; stub the panel and assert it is mounted.
vi.mock("@/features/saraswati/SaraswatiPanel", () => ({
  SaraswatiPanel: () => <div data-testid="saraswati-panel">Saraswati panel</div>,
}));

import CareerGuidancePage from "@/pages/student/CareerGuidancePage";

describe("CareerGuidancePage + Saraswati", () => {
  it("shows the Saraswati voice section alongside the existing written report flow", async () => {
    render(
      <MemoryRouter>
        <CareerGuidancePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Talk it through with Saraswati/ })).toBeInTheDocument();
    expect(await screen.findByTestId("saraswati-panel")).toBeInTheDocument();
    // Existing feature preserved.
    expect(screen.getByRole("button", { name: /Generate Guidance/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Target role")).toBeInTheDocument();
  });
});
