import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResumeStats, ResumeSummary } from "@/services/resumes.service";

const state: { stats: ResumeStats; resumes: ResumeSummary[] } = {
  stats: { totalCount: 0, completedCount: 0, draftCount: 0, lastUpdated: null },
  resumes: [],
};
const removeMutate = vi.fn();
const duplicateMutate = vi.fn();
const renameMutate = vi.fn();
const mutation = (mutate = vi.fn()) => ({ mutate, isPending: false });

vi.mock("@/hooks/student/useResumes", () => ({
  useMyResumeStats: () => ({ data: state.stats, isLoading: false, isError: false, refetch: vi.fn() }),
  useMyResumes: () => ({ data: { data: state.resumes, count: state.resumes.length, page: 1, pageSize: 12, totalPages: 1 }, isLoading: false, isError: false, refetch: vi.fn() }),
  useResumeMutations: () => ({
    rename: mutation(renameMutate),
    changeTemplate: mutation(),
    duplicate: mutation(duplicateMutate),
    remove: mutation(removeMutate),
    generatePdf: mutation(),
  }),
}));

import MyResumesPage from "@/pages/student/resume-builder/MyResumesPage";

const resume = (over: Partial<ResumeSummary>): ResumeSummary => ({
  id: "r1", title: "Software Developer Resume", target_role: "Software Developer", template_id: null, status: "draft", revision: 3,
  created_at: "2026-11-20T10:00:00Z", updated_at: "2026-11-20T11:00:00Z", latest_generated_at: null, latest_generated_revision: null, latest_pdf_path: null,
  ...over,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <MyResumesPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  removeMutate.mockReset();
  duplicateMutate.mockReset();
  renameMutate.mockReset();
  state.stats = { totalCount: 0, completedCount: 0, draftCount: 0, lastUpdated: null };
  state.resumes = [];
});

describe("My Resumes dashboard", () => {
  it("shows the empty state with real zero counts and a create action", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "My Resumes" })).toBeInTheDocument();
    expect(screen.getByText("Create, improve, and manage professional ATS-friendly resumes with AI.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your professional journey starts here." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create My First Resume" })).toHaveAttribute("href", "/dashboard/resume-builder/new");
    const total = screen.getByText("Total resumes").closest("div")!;
    expect(within(total).getByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Continue draft/ })).not.toBeInTheDocument();
  });

  it("renders statistics and cards from the student's data with continue-draft", () => {
    state.stats = { totalCount: 2, completedCount: 1, draftCount: 1, lastUpdated: { id: "r1", title: "Software Developer Resume", updatedAt: "2026-11-20T11:00:00Z" } };
    state.resumes = [resume({}), resume({ id: "r2", title: "Data Analyst Resume", status: "completed", latest_pdf_path: "u/r2/v1.pdf", latest_generated_revision: 1, revision: 2 })];
    renderPage();
    expect(within(screen.getByText("Total resumes").closest("div")!).getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Software Developer Resume" })).toBeInTheDocument();
    expect(screen.getByText("Completed (PDF outdated)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue draft: Software Developer Resume" })).toHaveAttribute("href", "/dashboard/resume-builder/r1/edit");
    expect(screen.getByRole("link", { name: "Preview Data Analyst Resume PDF" })).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, focusing Cancel, and deletes only on confirm", async () => {
    const user = userEvent.setup();
    state.stats = { totalCount: 1, completedCount: 0, draftCount: 1, lastUpdated: null };
    state.resumes = [resume({})];
    renderPage();
    await user.click(screen.getByRole("button", { name: "Actions for Software Developer Resume" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Delete “Software Developer Resume”\?/)).toBeInTheDocument();
    expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus());
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(removeMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Actions for Software Developer Resume" }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete resume" }));
    expect(removeMutate).toHaveBeenCalledWith("r1", expect.any(Object));
  });

  it("explains unavailable PDF actions in their names instead of hiding why", async () => {
    const user = userEvent.setup();
    state.resumes = [resume({})];
    renderPage();
    await user.click(screen.getByRole("button", { name: "Actions for Software Developer Resume" }));
    expect(await screen.findByRole("menuitem", { name: /Download PDF \(no PDF generated yet\)/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem", { name: /Regenerate PDF \(templates coming soon\)/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("duplicates via a named dialog prefilled with a copy title", async () => {
    const user = userEvent.setup();
    state.resumes = [resume({})];
    renderPage();
    await user.click(screen.getByRole("button", { name: "Actions for Software Developer Resume" }));
    await user.click(await screen.findByRole("menuitem", { name: /Duplicate/ }));
    const input = await screen.findByLabelText("Resume title");
    expect(input).toHaveValue("Software Developer Resume (Copy)");
    await user.clear(input);
    await user.type(input, "Data Analyst Resume");
    await user.click(screen.getByRole("button", { name: "Create copy" }));
    expect(duplicateMutate).toHaveBeenCalledWith({ id: "r1", title: "Data Analyst Resume" }, expect.any(Object));
  });
});
