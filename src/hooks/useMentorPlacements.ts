import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyJobPostings,
  createMentorJobPosting,
  updateMentorJobPosting,
  submitJobForReview,
  withdrawJobSubmission,
  setMentorJobOpenState,
  archiveMentorJobPosting,
  duplicateMentorJobPosting,
  type JobPostingInput,
} from "@/services/placement-jobs.service";
import { listApplicantsForJob } from "@/services/placement-applications.service";
import { listHiringPartners } from "@/services/placement-partners.service";

export const mentorPlacementQueryKeys = {
  myJobPostings: (mentorId: string) => ["mentor", "placements", "job-postings", mentorId] as const,
  applicantsForJob: (jobId: string) => ["mentor", "placements", "applicants", jobId] as const,
  hiringPartners: ["mentor", "placements", "hiring-partners"] as const,
};

// ─── Job postings ────────────────────────────────────────────────────────────

export function useMentorJobPostings(mentorId: string | undefined) {
  return useQuery({
    queryKey: mentorPlacementQueryKeys.myJobPostings(mentorId ?? ""),
    queryFn: () => listMyJobPostings(mentorId ?? ""),
    enabled: !!mentorId,
  });
}

/** Hiring partners are shared/admin-managed reference data; mentors pick from the existing list rather than creating their own. */
export function useMentorHiringPartners() {
  return useQuery({
    queryKey: mentorPlacementQueryKeys.hiringPartners,
    queryFn: () => listHiringPartners(false),
  });
}

export function useCreateMentorJobPosting(mentorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JobPostingInput) => createMentorJobPosting(mentorId ?? "", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mentorPlacementQueryKeys.myJobPostings(mentorId ?? "") }),
  });
}

export function useUpdateMentorJobPosting(mentorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: Partial<Omit<JobPostingInput, "status">> }) => updateMentorJobPosting(input.id, input.patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mentorPlacementQueryKeys.myJobPostings(mentorId ?? "") }),
  });
}

export function useSubmitJobForReview(mentorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitJobForReview(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mentorPlacementQueryKeys.myJobPostings(mentorId ?? "") }),
  });
}

export function useWithdrawJobSubmission(mentorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => withdrawJobSubmission(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mentorPlacementQueryKeys.myJobPostings(mentorId ?? "") }),
  });
}

export function useSetMentorJobOpenState(mentorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; isOpen: boolean }) => setMentorJobOpenState(input.id, input.isOpen),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mentorPlacementQueryKeys.myJobPostings(mentorId ?? "") }),
  });
}

export function useArchiveMentorJobPosting(mentorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveMentorJobPosting(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mentorPlacementQueryKeys.myJobPostings(mentorId ?? "") }),
  });
}

export function useDuplicateMentorJobPosting(mentorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobPostingId: string) => duplicateMentorJobPosting(jobPostingId, mentorId ?? ""),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: mentorPlacementQueryKeys.myJobPostings(mentorId ?? "") }),
  });
}

// ─── Applicants (read-only for mentors - stage advancement/interviews/offers stay admin-only) ──

export function useMentorApplicantsForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: mentorPlacementQueryKeys.applicantsForJob(jobId ?? ""),
    queryFn: () => listApplicantsForJob(jobId ?? ""),
    enabled: !!jobId,
  });
}
