import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  browseOpenJobs,
  getJobPosting,
  type JobBrowseFilters,
} from "@/services/placement-jobs.service";
import {
  applyToJob,
  withdrawApplication,
  listMyApplications,
  getMyApplicationForJob,
  listStatusHistory,
} from "@/services/placement-applications.service";
import { listSavedJobIds, saveJob, unsaveJob } from "@/services/saved-placements.service";
import { listInterviewRounds, listMyUpcomingInterviews } from "@/services/placement-interviews.service";
import { listMyOffers } from "@/services/placement-offers.service";
import {
  uploadApplicationDocument,
  listApplicationDocuments,
  deleteApplicationDocument,
  type DocumentType,
} from "@/services/placement-documents.service";

export const placementQueryKeys = {
  browseJobs: (filters: JobBrowseFilters) => ["placements", "browse", filters] as const,
  job: (id: string) => ["placements", "job", id] as const,
  myApplications: (studentId: string) => ["placements", "my-applications", studentId] as const,
  myApplicationForJob: (studentId: string, jobId: string) => ["placements", "my-application-for-job", studentId, jobId] as const,
  savedJobIds: (studentId: string) => ["placements", "saved-jobs", studentId] as const,
  interviewRounds: (applicationId: string) => ["placements", "interview-rounds", applicationId] as const,
  myUpcomingInterviews: (studentId: string) => ["placements", "my-upcoming-interviews", studentId] as const,
  myOffers: (studentId: string) => ["placements", "my-offers", studentId] as const,
  statusHistory: (applicationId: string) => ["placements", "status-history", applicationId] as const,
  applicationDocuments: (applicationId: string) => ["placements", "application-documents", applicationId] as const,
};

export function useBrowseJobs(filters: JobBrowseFilters = {}) {
  return useQuery({
    queryKey: placementQueryKeys.browseJobs(filters),
    queryFn: () => browseOpenJobs(filters),
  });
}

export function useJobPosting(id: string | undefined) {
  return useQuery({
    queryKey: placementQueryKeys.job(id ?? ""),
    queryFn: () => getJobPosting(id ?? ""),
    enabled: !!id,
  });
}

export function useMyApplications() {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: placementQueryKeys.myApplications(studentId ?? ""),
    queryFn: () => listMyApplications(studentId ?? ""),
    enabled: !!studentId,
  });
}

export function useMyApplicationForJob(jobId: string | undefined) {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: placementQueryKeys.myApplicationForJob(studentId ?? "", jobId ?? ""),
    queryFn: () => getMyApplicationForJob(studentId ?? "", jobId ?? ""),
    enabled: !!studentId && !!jobId,
  });
}

export function useApplyToJob() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobPostingId: string; resumeFileId: string; coverNote?: string }) =>
      applyToJob(input.jobPostingId, input.resumeFileId, input.coverNote),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: placementQueryKeys.myApplications(studentId ?? "") });
      void queryClient.invalidateQueries({ queryKey: placementQueryKeys.myApplicationForJob(studentId ?? "", variables.jobPostingId) });
    },
  });
}

export function useWithdrawApplication() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => withdrawApplication(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: placementQueryKeys.myApplications(studentId ?? "") });
    },
  });
}

export function useSavedJobIds() {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: placementQueryKeys.savedJobIds(studentId ?? ""),
    queryFn: () => listSavedJobIds(studentId ?? ""),
    enabled: !!studentId,
  });
}

export function useToggleSavedJob() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { jobPostingId: string; isSaved: boolean }) =>
      input.isSaved ? unsaveJob(studentId ?? "", input.jobPostingId) : saveJob(studentId ?? "", input.jobPostingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: placementQueryKeys.savedJobIds(studentId ?? "") });
    },
  });
}

export function useInterviewRounds(applicationId: string | undefined) {
  return useQuery({
    queryKey: placementQueryKeys.interviewRounds(applicationId ?? ""),
    queryFn: () => listInterviewRounds(applicationId ?? ""),
    enabled: !!applicationId,
  });
}

export function useMyUpcomingInterviews() {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: placementQueryKeys.myUpcomingInterviews(studentId ?? ""),
    queryFn: () => listMyUpcomingInterviews(studentId ?? ""),
    enabled: !!studentId,
  });
}

export function useMyOffers() {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: placementQueryKeys.myOffers(studentId ?? ""),
    queryFn: () => listMyOffers(studentId ?? ""),
    enabled: !!studentId,
  });
}

export function useStatusHistory(applicationId: string | undefined) {
  return useQuery({
    queryKey: placementQueryKeys.statusHistory(applicationId ?? ""),
    queryFn: () => listStatusHistory(applicationId ?? ""),
    enabled: !!applicationId,
  });
}

export function useApplicationDocuments(applicationId: string | undefined) {
  return useQuery({
    queryKey: placementQueryKeys.applicationDocuments(applicationId ?? ""),
    queryFn: () => listApplicationDocuments(applicationId ?? ""),
    enabled: !!applicationId,
  });
}

export function useUploadApplicationDocument(applicationId: string | undefined) {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; documentType: DocumentType }) => {
      if (!applicationId || !studentId) throw new Error("Missing application context");
      return uploadApplicationDocument(applicationId, studentId, input.file, input.documentType);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: placementQueryKeys.applicationDocuments(applicationId ?? "") });
    },
  });
}

export function useDeleteApplicationDocument(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApplicationDocument(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: placementQueryKeys.applicationDocuments(applicationId ?? "") });
    },
  });
}
