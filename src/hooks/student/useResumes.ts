import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  changeResumeTemplate,
  createResume,
  createResumeVersion,
  deleteResume,
  duplicateResume,
  getLatestPdfJob,
  getMyResumeStats,
  getResume,
  listMyResumes,
  listResumeVersions,
  renameResume,
  requestPdfGeneration,
  restoreResumeVersion,
  type CreateResumeInput,
  type ResumeDetail,
} from "@/services/resumes.service";
import {
  getResumeProfile,
  listResumeAchievements,
  listResumeCertifications,
  listResumeExperience,
  listResumeProjects,
} from "@/services/resume.service";
import type { ProfileImportSource } from "@/features/resume-builder/domain/profile-import";

export const resumesKeys = {
  all: (uid: string) => ["resumes", uid] as const,
  list: (uid: string, page: number) => ["resumes", uid, "list", page] as const,
  stats: (uid: string) => ["resumes", uid, "stats"] as const,
  detail: (uid: string, id: string) => ["resumes", uid, "detail", id] as const,
  versions: (uid: string, id: string) => ["resumes", uid, "versions", id] as const,
  pdfJob: (uid: string, id: string) => ["resumes", uid, "pdf-job", id] as const,
};

function useUid(): string {
  const { user } = useAuth();
  return user?.id ?? "";
}

export function useMyResumes(page: number) {
  const uid = useUid();
  return useQuery({
    queryKey: resumesKeys.list(uid, page),
    queryFn: () => listMyResumes({ page }),
    enabled: !!uid,
    placeholderData: keepPreviousData,
  });
}

export function useMyResumeStats() {
  const uid = useUid();
  return useQuery({ queryKey: resumesKeys.stats(uid), queryFn: getMyResumeStats, enabled: !!uid });
}

export function useResumeDetail(id: string | undefined) {
  const uid = useUid();
  return useQuery({
    queryKey: resumesKeys.detail(uid, id ?? ""),
    queryFn: () => getResume(id ?? ""),
    enabled: !!uid && !!id,
    // The editor owns the working copy once loaded; background refetches would fight autosave.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: (count, error) => error.name !== "ResumeNotFoundError" && count < 2,
  });
}

export function useResumeVersions(id: string | undefined, enabled = true) {
  const uid = useUid();
  return useQuery({ queryKey: resumesKeys.versions(uid, id ?? ""), queryFn: () => listResumeVersions(id ?? ""), enabled: !!uid && !!id && enabled });
}

export function useLatestPdfJob(id: string | undefined) {
  const uid = useUid();
  return useQuery({
    queryKey: resumesKeys.pdfJob(uid, id ?? ""),
    queryFn: () => getLatestPdfJob(id ?? ""),
    enabled: !!uid && !!id,
    // Poll only while a job is in flight.
    refetchInterval: (query) => (query.state.data && ["pending", "processing"].includes(query.state.data.status) ? 2500 : false),
  });
}

/** Invalidates list + stats (+ optionally one resume's detail) for the current student. */
export function useInvalidateResumes() {
  const uid = useUid();
  const queryClient = useQueryClient();
  return (resumeId?: string) => {
    void queryClient.invalidateQueries({ queryKey: [...resumesKeys.all(uid), "list"] });
    void queryClient.invalidateQueries({ queryKey: resumesKeys.stats(uid) });
    if (resumeId) {
      void queryClient.invalidateQueries({ queryKey: resumesKeys.versions(uid, resumeId) });
      void queryClient.invalidateQueries({ queryKey: resumesKeys.pdfJob(uid, resumeId) });
    }
  };
}

export function useResumeMutations() {
  const uid = useUid();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateResumes();
  const setDetail = (detail: ResumeDetail) => queryClient.setQueryData(resumesKeys.detail(uid, detail.id), detail);

  return {
    create: useMutation({
      mutationFn: (input: CreateResumeInput) => createResume(input),
      onSuccess: (detail) => {
        setDetail(detail);
        invalidate();
      },
    }),
    rename: useMutation({
      mutationFn: (input: { id: string; title: string }) => renameResume(input.id, input.title),
      onSuccess: (_s, input) => {
        void queryClient.invalidateQueries({ queryKey: resumesKeys.detail(uid, input.id) });
        invalidate();
      },
    }),
    changeTemplate: useMutation({
      mutationFn: (input: { id: string; templateId: string }) => changeResumeTemplate(input.id, input.templateId),
      onSuccess: (_s, input) => {
        void queryClient.invalidateQueries({ queryKey: resumesKeys.detail(uid, input.id) });
        invalidate();
      },
    }),
    duplicate: useMutation({
      mutationFn: (input: { id: string; title?: string }) => duplicateResume(input.id, input.title),
      onSuccess: () => invalidate(),
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteResume(id, uid),
      onSuccess: (_v, id) => {
        queryClient.removeQueries({ queryKey: resumesKeys.detail(uid, id) });
        invalidate();
      },
    }),
    createVersion: useMutation({
      mutationFn: (input: { id: string; label?: string }) => createResumeVersion(input.id, input.label),
      onSuccess: (_v, input) => invalidate(input.id),
    }),
    restoreVersion: useMutation({
      mutationFn: (input: { versionId: string; expectedRevision: number }) => restoreResumeVersion(input.versionId, input.expectedRevision),
      onSuccess: (detail) => {
        setDetail(detail);
        invalidate(detail.id);
      },
    }),
    generatePdf: useMutation({
      mutationFn: (id: string) => requestPdfGeneration(id),
      onSettled: (_r, _e, id) => {
        void queryClient.invalidateQueries({ queryKey: resumesKeys.detail(uid, id) });
        invalidate(id);
      },
    }),
  };
}

/** Reads the student's existing profile + classic resume tables for "Import from my profile". */
export function useLoadProfileImportSource() {
  const uid = useUid();
  return async (): Promise<ProfileImportSource> => {
    if (!uid) throw new Error("Your session has expired. Please sign in again.");
    const [profile, experience, projects, certifications, achievements] = await Promise.all([
      getResumeProfile(uid).catch(() => null),
      listResumeExperience(uid).catch(() => []),
      listResumeProjects(uid).catch(() => []),
      listResumeCertifications(uid).catch(() => []),
      listResumeAchievements(uid).catch(() => []),
    ]);
    return { profile, experience, projects, certifications, achievements };
  };
}
