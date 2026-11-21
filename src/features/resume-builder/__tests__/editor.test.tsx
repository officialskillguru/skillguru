import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyResumeData } from "../domain/resume-schema";
import type { ResumeDetail } from "@/services/resumes.service";

import type * as ResumesService from "@/services/resumes.service";
import type * as ResumesHooks from "@/hooks/student/useResumes";

const { saveResume, invokeResumeFunction } = vi.hoisted(() => ({
  saveResume: vi.fn<typeof ResumesService.saveResume>(),
  invokeResumeFunction: vi.fn<(name: string, body: Record<string, unknown>) => Promise<unknown>>(),
}));
let resume: ResumeDetail;

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/services/resumes.service", async (importOriginal) => ({
  ...(await importOriginal<typeof ResumesService>()),
  saveResume,
  invokeResumeFunction,
}));
vi.mock("@/hooks/student/useResumes", async (importOriginal) => {
  const actual = await importOriginal<typeof ResumesHooks>();
  const m = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    ...actual,
    useResumeDetail: () => ({ data: resume, isLoading: false, error: null }),
    useInvalidateResumes: () => vi.fn(),
    useResumeVersions: () => ({ data: [], isLoading: false, isError: false }),
    useLatestPdfJob: () => ({ data: null }),
    useResumeMutations: () => ({ create: m(), rename: m(), changeTemplate: m(), duplicate: m(), remove: m(), createVersion: m(), restoreVersion: m(), generatePdf: m() }),
    useLoadProfileImportSource: () => vi.fn(),
  };
});

import ResumeEditorPage from "@/pages/student/resume-builder/ResumeEditorPage";

function renderEditor(step = 0) {
  const router = createMemoryRouter([{ path: "/dashboard/resume-builder/:resumeId/edit", element: <ResumeEditorPage /> }], {
    initialEntries: [`/dashboard/resume-builder/r1/edit?step=${step}`],
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  localStorage.clear();
  saveResume.mockReset();
  invokeResumeFunction.mockReset();
  saveResume.mockImplementation((_id, revision, patch) =>
    Promise.resolve({ ...resume, revision: revision + 1, ...(patch.data ? { resume_data: patch.data } : {}), ...(patch.title ? { title: patch.title } : {}) }),
  );
  resume = {
    id: "r1", user_id: "u1", title: "Software Developer Resume", target_role: "Software Developer", template_id: null, status: "draft",
    resume_data: emptyResumeData(), schema_version: 1, revision: 4, current_version: 0, latest_generated_at: null, latest_generated_revision: null,
    latest_pdf_path: null, created_at: "2026-11-20T10:00:00Z", updated_at: "2026-11-20T10:00:00Z",
  };
});

describe("Resume editor wizard", () => {
  it("navigates steps, moves focus to the new step heading and records the step in the URL", async () => {
    const user = userEvent.setup();
    const router = renderEditor(0);
    expect(screen.getByRole("heading", { level: 2, name: "Resume Setup" })).toBeInTheDocument();
    // Only active, licence-reviewed templates are offered (simple-cv is hidden pending its licence).
    expect(screen.getByRole("radio", { name: "Classic ATS" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Modern Minimal" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Simple CV" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Next/ }));
    const heading = await screen.findByRole("heading", { level: 2, name: "Personal Information" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(router.state.location.search).toContain("step=1");
    expect(screen.getByRole("button", { name: /Personal Information/, current: "step" })).toBeInTheDocument();
  });

  it("blocks Next on invalid formats with a focused error summary, but never loses the typed value", async () => {
    const user = userEvent.setup();
    renderEditor(1);
    const email = screen.getByLabelText(/Email address/);
    await user.type(email, "aarav@");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    const summary = (await screen.findByText("Please fix 1 field before continuing:")).parentElement!;
    await waitFor(() => expect(summary).toHaveFocus());
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveValue("aarav@");
    expect(screen.getByRole("heading", { level: 2, name: "Personal Information" })).toBeInTheDocument();
    // Each summary item is a button that jumps to the field it describes.
    await user.click(within(summary).getByRole("button", { name: /valid email address/ }));
    expect(email).toHaveFocus();
  }, 15_000);

  it("autosaves edits with the current revision", async () => {
    const user = userEvent.setup();
    renderEditor(1);
    await user.type(screen.getByLabelText(/Full name/), "Aarav Sharma");
    await waitFor(() => expect(saveResume).toHaveBeenCalled(), { timeout: 4000 });
    const [id, revision, patch] = saveResume.mock.calls.at(-1) as [string, number, { data: ResumeDetail["resume_data"] }];
    expect(id).toBe("r1");
    expect(revision).toBe(4);
    expect(patch.data.personal.fullName).toBe("Aarav Sharma");
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  }, 15_000);

  it("adds repeatable entries, focuses the new entry and names it from its content", async () => {
    const user = userEvent.setup();
    renderEditor(3);
    expect(screen.getByText("No education added yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add education/ }));
    const institution = await screen.findByLabelText("Institution");
    await waitFor(() => expect(institution).toHaveFocus());
    await user.type(screen.getByLabelText(/^Degree/), "BCA");
    expect(screen.getByText("Education 1: BCA")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add education/ }));
    expect(screen.getByRole("button", { name: "Move Education 1: BCA down" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move Education 1: BCA up" })).toBeDisabled();
    // Moving the first entry to the end keeps focus on a usable move button, not <body>.
    await user.click(screen.getByRole("button", { name: "Move Education 1: BCA down" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Move Education 2: BCA up" })).toHaveFocus());
    // Entries are named groups.
    expect(screen.getByRole("group", { name: "Education 2: BCA" })).toBeInTheDocument();
  }, 15_000);

  it("AI improvement: asks consent once, compares original vs improved, and only applies on Accept", async () => {
    const user = userEvent.setup();
    invokeResumeFunction.mockResolvedValue({
      original: "made attendance website using react node and mongodb",
      improvedText: "Developed an attendance management web application using React, Node.js and MongoDB.",
      changes: ["Used an action verb"],
      missingInformation: ["If you know how many students used it, add the real number."],
    });
    renderEditor(5);
    await user.click(screen.getByRole("button", { name: /Add project/ }));
    const description = await screen.findByLabelText("Project description");
    await user.type(description, "made attendance website using react node and mongodb");

    await user.click(screen.getByRole("button", { name: "Improve with AI: Project description" }));
    const consent = await screen.findByRole("dialog", { name: "Before you use AI suggestions" });
    await user.click(within(consent).getByRole("button", { name: "Continue with AI" }));

    const compare = await screen.findByRole("dialog", { name: /Project description/ });
    expect(within(compare).getByRole("heading", { name: "Original" })).toBeInTheDocument();
    expect(await within(compare).findByText(/Developed an attendance management web application/)).toBeInTheDocument();
    expect(invokeResumeFunction).toHaveBeenCalledWith("resume-ai", expect.objectContaining({ operation: "improve_project", text: "made attendance website using react node and mongodb" }));
    expect(description).toHaveValue("made attendance website using react node and mongodb"); // unchanged until accepted

    await user.click(within(compare).getByRole("button", { name: "Keep original" }));
    expect(description).toHaveValue("made attendance website using react node and mongodb");

    // Second use: no consent prompt again; Accept applies the text.
    await user.click(screen.getByRole("button", { name: "Improve with AI: Project description" }));
    const again = await screen.findByRole("dialog", { name: /Project description/ });
    await within(again).findByText(/Developed an attendance/);
    await user.click(within(again).getByRole("button", { name: "Accept improvement" }));
    expect(description).toHaveValue("Developed an attendance management web application using React, Node.js and MongoDB.");
  }, 15_000);

  it("shows a friendly AI error and keeps the student's text when AI fails", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sg-resume-ai-consent:v1:u1", "yes");
    const { EdgeFunctionError } = await import("@/services/resumes.service");
    invokeResumeFunction.mockRejectedValue(new EdgeFunctionError("AI improvement is temporarily unavailable. You can continue editing manually.", "AI_UNAVAILABLE", 502));
    renderEditor(2);
    const summary = screen.getByLabelText("Professional summary");
    await user.type(summary, "I am a BCA student and I know Python");
    await user.click(screen.getByRole("button", { name: "Improve with AI: Professional summary" }));
    const dialog = await screen.findByRole("dialog", { name: /Professional summary/ });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("temporarily unavailable");
    expect(within(dialog).getByRole("button", { name: "Accept improvement" })).toBeDisabled();
    expect(summary).toHaveValue("I am a BCA student and I know Python");
  }, 15_000);
});
