import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listHiringPartners,
  createHiringPartner,
  updateHiringPartner,
  softDeleteHiringPartner,
  restoreHiringPartner,
  type HiringPartnerInput,
} from "@/services/placement-partners.service";
import {
  listAllJobPostings,
  createJobPosting,
  updateJobPosting,
  softDeleteJobPosting,
  getJobPosting,
  type JobPostingInput,
} from "@/services/placement-jobs.service";
import { notificationsService } from "@/services/notifications.service";
import {
  listApplicantsForJob,
  listAllApplications,
  advanceApplicationStage,
  listStatusHistory,
  type PlacementStage,
} from "@/services/placement-applications.service";
import {
  scheduleInterviewRound,
  recordInterviewFeedback,
  listInterviewRounds,
  listFeedbackForRound,
  type ScheduleInterviewInput,
  type RecordFeedbackInput,
} from "@/services/placement-interviews.service";
import { releaseOffer, markPlacementJoined, getOfferForApplication, type ReleaseOfferInput } from "@/services/placement-offers.service";

export const adminPlacementQueryKeys = {
  hiringPartners: ["admin", "placements", "hiring-partners"] as const,
  jobPostings: ["admin", "placements", "job-postings"] as const,
  applicantsForJob: (jobId: string) => ["admin", "placements", "applicants", jobId] as const,
  allApplications: ["admin", "placements", "all-applications"] as const,
  interviewRounds: (applicationId: string) => ["admin", "placements", "interview-rounds", applicationId] as const,
  feedbackForRound: (roundId: string) => ["admin", "placements", "feedback", roundId] as const,
  offerForApplication: (applicationId: string) => ["admin", "placements", "offer", applicationId] as const,
  statusHistory: (applicationId: string) => ["admin", "placements", "status-history", applicationId] as const,
};

// ─── Hiring partners ─────────────────────────────────────────────────────────

export function useAdminHiringPartners() {
  return useQuery({
    queryKey: adminPlacementQueryKeys.hiringPartners,
    queryFn: () => listHiringPartners(true),
  });
}

export function useCreateHiringPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HiringPartnerInput) => createHiringPartner(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.hiringPartners }),
  });
}

export function useUpdateHiringPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: Partial<HiringPartnerInput> }) => updateHiringPartner(input.id, input.patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.hiringPartners }),
  });
}

export function useSoftDeleteHiringPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteHiringPartner(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.hiringPartners }),
  });
}

export function useRestoreHiringPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreHiringPartner(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.hiringPartners }),
  });
}

// ─── Job postings ────────────────────────────────────────────────────────────

export function useAdminJobPostings() {
  return useQuery({
    queryKey: adminPlacementQueryKeys.jobPostings,
    queryFn: () => listAllJobPostings(),
  });
}

export function useCreateJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JobPostingInput) => createJobPosting(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.jobPostings }),
  });
}

/**
 * Publishing a job posting (status -> 'open') broadcasts to every student -
 * checked against the job's status *before* this update, so editing an
 * already-open posting never re-notifies. Every other placement-pipeline
 * notification (application status, interview, offer) is already handled by
 * its own SECURITY DEFINER RPC; this is the one gap - a plain admin-only
 * UPDATE has no RPC of its own to carry a side effect.
 */
export function useUpdateJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<JobPostingInput> }) => {
      const isPublishing = input.patch.status === "open";
      const previous = isPublishing ? await getJobPosting(input.id) : null;
      const updated = await updateJobPosting(input.id, input.patch);
      if (isPublishing && previous && previous.status !== "open") {
        try {
          await notificationsService.broadcastNotification(
            "New job opportunity",
            `${updated.title} is now open for applications.`,
            "student",
            "placement",
            "/dashboard/placement"
          );
        } catch (notifyError) {
          console.error("Failed to notify students of the new job posting", notifyError);
        }
      }
      return updated;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.jobPostings }),
  });
}

export function useSoftDeleteJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteJobPosting(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.jobPostings }),
  });
}

/** Approves a mentor's under_review job posting (-> open) and notifies the owning mentor - mirrors useApproveCourse(). */
export function useApproveJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const job = await getJobPosting(id);
      const updated = await updateJobPosting(id, { status: "open" });
      if (job?.created_by) {
        await notificationsService.sendNotification(
          job.created_by,
          "Job posting approved",
          `"${updated.title}" has been approved and is now open for applications.`,
          { category: "placement", actionUrl: "/mentor/jobs", metadata: { job_posting_id: id } }
        );
      }
      return updated;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.jobPostings }),
  });
}

/** Rejects a mentor's under_review job posting (-> draft) with a reason, and notifies the owning mentor - mirrors useRejectCourse(). */
export function useRejectJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const job = await getJobPosting(input.id);
      const updated = await updateJobPosting(input.id, { status: "draft" });
      if (job?.created_by) {
        await notificationsService.sendNotification(
          job.created_by,
          "Job posting needs changes",
          `"${updated.title}" was sent back for changes: ${input.reason}`,
          { category: "placement", actionUrl: "/mentor/jobs", metadata: { job_posting_id: input.id, reason: input.reason } }
        );
      }
      return updated;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.jobPostings }),
  });
}

// ─── Applications / pipeline ─────────────────────────────────────────────────

export function useApplicantsForJob(jobId: string | undefined) {
  return useQuery({
    queryKey: adminPlacementQueryKeys.applicantsForJob(jobId ?? ""),
    queryFn: () => listApplicantsForJob(jobId ?? ""),
    enabled: !!jobId,
  });
}

export function useAllApplications() {
  return useQuery({
    queryKey: adminPlacementQueryKeys.allApplications,
    queryFn: () => listAllApplications(),
  });
}

export function useAdvanceApplicationStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { applicationId: string; newStatus: PlacementStage; note?: string }) =>
      advanceApplicationStage(input.applicationId, input.newStatus, input.note),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.allApplications });
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.statusHistory(variables.applicationId) });
    },
  });
}

export function useAdminStatusHistory(applicationId: string | undefined) {
  return useQuery({
    queryKey: adminPlacementQueryKeys.statusHistory(applicationId ?? ""),
    queryFn: () => listStatusHistory(applicationId ?? ""),
    enabled: !!applicationId,
  });
}

// ─── Interviews ──────────────────────────────────────────────────────────────

export function useAdminInterviewRounds(applicationId: string | undefined) {
  return useQuery({
    queryKey: adminPlacementQueryKeys.interviewRounds(applicationId ?? ""),
    queryFn: () => listInterviewRounds(applicationId ?? ""),
    enabled: !!applicationId,
  });
}

export function useScheduleInterviewRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleInterviewInput) => scheduleInterviewRound(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.interviewRounds(variables.applicationId) });
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.allApplications });
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.statusHistory(variables.applicationId) });
    },
  });
}

export function useFeedbackForRound(roundId: string | undefined) {
  return useQuery({
    queryKey: adminPlacementQueryKeys.feedbackForRound(roundId ?? ""),
    queryFn: () => listFeedbackForRound(roundId ?? ""),
    enabled: !!roundId,
  });
}

export function useRecordInterviewFeedback(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordFeedbackInput) => recordInterviewFeedback(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.feedbackForRound(variables.interviewRoundId) });
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.interviewRounds(applicationId ?? "") });
    },
  });
}

// ─── Offers ──────────────────────────────────────────────────────────────────

export function useOfferForApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: adminPlacementQueryKeys.offerForApplication(applicationId ?? ""),
    queryFn: () => getOfferForApplication(applicationId ?? ""),
    enabled: !!applicationId,
  });
}

export function useReleaseOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReleaseOfferInput) => releaseOffer(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.offerForApplication(variables.applicationId) });
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.allApplications });
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.statusHistory(variables.applicationId) });
    },
  });
}

export function useMarkPlacementJoined() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => markPlacementJoined(applicationId),
    onSuccess: (_data, applicationId) => {
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.allApplications });
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.offerForApplication(applicationId) });
      void queryClient.invalidateQueries({ queryKey: adminPlacementQueryKeys.statusHistory(applicationId) });
    },
  });
}
