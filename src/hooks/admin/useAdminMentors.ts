import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  listMentors,
  setMentorStatus,
  softDeleteMentor,
  restoreMentor,
  reassignMentorCourses,
} from "@/services/mentors.service";
import { notificationsService } from "@/services/notifications.service";
type MentorListParams = unknown;

export function useAdminMentors(params: MentorListParams) {
  return useQuery({
    queryKey: ["admin_mentors", params],
    queryFn: async () => {
      return await listMentors(params as Parameters<typeof listMentors>[0]);
    },
    placeholderData: keepPreviousData,
  });
}

const invalidateMentors = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ queryKey: ["admin_mentors"] });

export function useBulkSetMentorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mentorIds, status }: { mentorIds: string[]; status: "active" | "suspended" }) => {
      await Promise.all(mentorIds.map((id) => setMentorStatus(id, status)));
      return true;
    },
    onSuccess: () => void invalidateMentors(queryClient),
  });
}

export function useBulkDeleteMentors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mentorIds: string[]) => {
      await Promise.all(mentorIds.map((id) => softDeleteMentor(id)));
      return true;
    },
    onSuccess: () => void invalidateMentors(queryClient),
  });
}

export function useBulkRestoreMentors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mentorIds: string[]) => {
      await Promise.all(mentorIds.map((id) => restoreMentor(id)));
      return true;
    },
    onSuccess: () => void invalidateMentors(queryClient),
  });
}

export function useBulkNotifyMentors() {
  return useMutation({
    mutationFn: async ({ mentorIds, title, body }: { mentorIds: string[]; title: string; body: string }) => {
      await Promise.all(mentorIds.map((id) => notificationsService.sendNotification(id, title, body, { type: "admin_broadcast", category: "general" })));
      return true;
    },
  });
}

/** Reassigns every course owned by any of the given mentors to a single destination mentor — the only well-defined "bulk course assignment" given courses.mentor_id is a single required owner (see TASKS.md Phase 3). */
export function useBulkReassignMentorCourses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseIds, toMentorId }: { courseIds: string[]; toMentorId: string }) => {
      await reassignMentorCourses(courseIds, toMentorId);
      return true;
    },
    onSuccess: () => void invalidateMentors(queryClient),
  });
}
