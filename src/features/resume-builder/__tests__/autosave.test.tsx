import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyResumeData } from "../domain/resume-schema";

import type * as ResumesService from "@/services/resumes.service";

const { saveResume } = vi.hoisted(() => ({ saveResume: vi.fn<typeof ResumesService.saveResume>() }));
vi.mock("@/services/resumes.service", async (importOriginal) => ({ ...(await importOriginal<typeof ResumesService>()), saveResume }));

import { ResumeConflictError, type ResumeDetail } from "@/services/resumes.service";
import { useResumeAutosave } from "../hooks/useResumeAutosave";

const detail = (revision: number): ResumeDetail => ({
    id: "r1", user_id: "u1", title: "T", target_role: null, template_id: null, status: "draft", resume_data: emptyResumeData(), schema_version: 1,
    revision, current_version: 0, latest_generated_at: null, latest_generated_revision: null, latest_pdf_path: null, created_at: "", updated_at: "",
});

beforeEach(() => {
  vi.useFakeTimers();
  saveResume.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("useResumeAutosave", () => {
  it("debounces rapid edits into one save carrying the expected revision", async () => {
    saveResume.mockResolvedValue(detail(2));
    const { result } = renderHook(() => useResumeAutosave({ resumeId: "r1", initialRevision: 1, delayMs: 1000 }));
    act(() => {
      result.current.schedule({ title: "A" });
      result.current.schedule({ title: "AB" });
      result.current.schedule({ title: "ABC" });
    });
    expect(result.current.status).toBe("unsaved");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(saveResume).toHaveBeenCalledTimes(1);
    expect(saveResume).toHaveBeenCalledWith("r1", 1, { title: "ABC" });
    expect(result.current.status).toBe("saved");
    expect(result.current.getRevision()).toBe(2);
  });

  it("skips saving a snapshot identical to the last saved one", async () => {
    const { result } = renderHook(() => useResumeAutosave({ resumeId: "r1", initialRevision: 3 }));
    act(() => result.current.markSaved({ title: "Same" }, 3));
    let ok = false;
    await act(async () => {
      ok = await result.current.flush({ title: "Same" });
    });
    expect(ok).toBe(true);
    expect(saveResume).not.toHaveBeenCalled();
  });

  it("keeps the edit and reports an error when the save fails, then retries successfully", async () => {
    saveResume.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce(detail(2));
    const { result } = renderHook(() => useResumeAutosave({ resumeId: "r1", initialRevision: 1 }));
    let ok = true;
    await act(async () => {
      ok = await result.current.flush({ title: "Draft" });
    });
    expect(ok).toBe(false);
    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(/offline/i);
    expect(result.current.hasUnsavedChanges()).toBe(true);
    await act(async () => {
      ok = await result.current.flush();
    });
    expect(ok).toBe(true);
    expect(saveResume).toHaveBeenLastCalledWith("r1", 1, { title: "Draft" });
  });

  it("stops on a revision conflict and never silently overwrites; keep-mine retries on the newer revision", async () => {
    saveResume.mockRejectedValueOnce(new ResumeConflictError(detail(5))).mockResolvedValueOnce(detail(6));
    const { result } = renderHook(() => useResumeAutosave({ resumeId: "r1", initialRevision: 1 }));
    await act(async () => {
      await result.current.flush({ title: "Mine" });
    });
    expect(result.current.status).toBe("conflict");
    expect(result.current.conflict?.revision).toBe(5);

    // Further edits are held, not sent, while the conflict is unresolved.
    act(() => result.current.schedule({ title: "Mine 2" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(saveResume).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.resolveConflict("keep-mine");
    });
    expect(saveResume).toHaveBeenLastCalledWith("r1", 5, { title: "Mine 2" });
    expect(result.current.status).toBe("saved");
  });

  it("reload discards local pending edits and adopts the newer revision", async () => {
    saveResume.mockRejectedValueOnce(new ResumeConflictError(detail(9)));
    const { result } = renderHook(() => useResumeAutosave({ resumeId: "r1", initialRevision: 1 }));
    await act(async () => {
      await result.current.flush({ title: "Mine" });
    });
    let latest: ResumeDetail | null = null;
    await act(async () => {
      latest = await result.current.resolveConflict("reload");
    });
    expect(latest).not.toBeNull();
    expect(result.current.getRevision()).toBe(9);
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });
});
