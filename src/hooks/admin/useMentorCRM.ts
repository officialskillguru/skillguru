import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmService } from "@/services/crm.service";
import { listAuditLogs } from "@/services/auditLogs.service";
import {
  listMentorMeetings,
  createAdminMeeting,
  completeMeetingWithOutcome,
  type CreateAdminMeetingInput,
} from "@/services/mentor-booking.service";
import {
  listMentorCourses,
  reassignMentorCourses,
  getMentorPerformance,
  listAssignableCoursesForMentor,
  assignMentorToCourse,
  removeMentorFromCourse,
  setPrimaryMentorForCourse,
} from "@/services/mentors.service";
import {
  listMentorDocuments,
  uploadMentorDocument,
  deleteMentorDocument,
  type MentorDocumentType,
} from "@/services/mentor-documents.service";

const keys = {
  notes: (mentorId: string) => ["admin-mentor-notes", mentorId],
  tasks: (mentorId: string) => ["admin-mentor-tasks", mentorId],
  taskComments: (taskId: string) => ["admin-task-comments", taskId],
  meetings: (mentorId: string) => ["admin-mentor-meetings", mentorId],
  timeline: (mentorId: string) => ["admin-mentor-timeline", mentorId],
  courses: (mentorId: string) => ["admin-mentor-courses", mentorId],
  performance: (mentorId: string) => ["admin-mentor-performance", mentorId],
  documents: (mentorId: string) => ["admin-mentor-documents", mentorId],
};

export function useMentorNotes(mentorId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: keys.notes(mentorId),
    queryFn: async () => {
      const result = await crmService.getMentorNotes(mentorId);
      if (!result.success) throw result.error;
      return result.data;
    },
    enabled,
  });
  const addNote = useMutation({
    mutationFn: async (content: string) => {
      const result = await crmService.addMentorNote(mentorId, content);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.notes(mentorId) }),
  });
  return { ...query, addNote };
}

export function useMentorTasks(mentorId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.tasks(mentorId) });
  const query = useQuery({
    queryKey: keys.tasks(mentorId),
    queryFn: async () => {
      const result = await crmService.listTasks({ entityType: "mentor", entityId: mentorId });
      if (!result.success) throw result.error;
      return result.data;
    },
    enabled,
  });
  const createTask = useMutation({
    mutationFn: async (input: Parameters<typeof crmService.createTask>[0]) => {
      const result = await crmService.createTask({ ...input, entity_type: "mentor", entity_id: mentorId });
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: invalidate,
  });
  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Parameters<typeof crmService.updateTask>[1] }) => {
      const result = await crmService.updateTask(id, updates);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: invalidate,
  });
  return { ...query, createTask, updateTask };
}

export function useTaskComments(taskId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: keys.taskComments(taskId ?? ""),
    queryFn: async () => {
      const result = await crmService.getTaskComments(taskId!);
      if (!result.success) throw result.error;
      return result.data;
    },
    enabled: !!taskId,
  });
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const result = await crmService.addTaskComment(taskId!, content);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.taskComments(taskId ?? "") }),
  });
  return { ...query, addComment };
}

export function useMentorMeetings(mentorId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.meetings(mentorId) });
  const query = useQuery({
    queryKey: keys.meetings(mentorId),
    queryFn: () => listMentorMeetings(mentorId),
    enabled,
  });
  const scheduleMeeting = useMutation({
    mutationFn: (input: CreateAdminMeetingInput) => createAdminMeeting(input),
    onSuccess: invalidate,
  });
  const completeMeeting = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: string }) => completeMeetingWithOutcome(id, outcome),
    onSuccess: invalidate,
  });
  return { ...query, scheduleMeeting, completeMeeting };
}

export function useMentorTimeline(mentorId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.timeline(mentorId),
    queryFn: () => listAuditLogs({ entityId: mentorId, pageSize: 50 }),
    enabled,
  });
}

export function useMentorCourses(mentorId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: keys.courses(mentorId),
    queryFn: () => listMentorCourses(mentorId),
    enabled,
  });
  const assignableQuery = useQuery({
    queryKey: [...keys.courses(mentorId), "assignable"],
    queryFn: () => listAssignableCoursesForMentor(mentorId),
    enabled,
  });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: keys.courses(mentorId) });
    // A course_mentors change can affect other mentors' assignable lists too
    // (e.g. this mentor becoming primary doesn't change theirs, but keep it simple
    // and correct rather than trying to selectively invalidate every other mentor).
    void queryClient.invalidateQueries({ queryKey: ["admin-mentor-courses"] });
  };
  const reassign = useMutation({
    mutationFn: ({ courseIds, toMentorId }: { courseIds: string[]; toMentorId: string }) => reassignMentorCourses(courseIds, toMentorId),
    onSuccess: invalidate,
  });
  const assign = useMutation({
    mutationFn: (courseId: string) => assignMentorToCourse(mentorId, courseId),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (courseId: string) => removeMentorFromCourse(mentorId, courseId),
    onSuccess: invalidate,
  });
  const setPrimary = useMutation({
    mutationFn: (courseId: string) => setPrimaryMentorForCourse(mentorId, courseId),
    onSuccess: invalidate,
  });
  return { ...query, assignableQuery, reassign, assign, remove, setPrimary };
}

export function useMentorPerformance(mentorId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.performance(mentorId),
    queryFn: () => getMentorPerformance(mentorId),
    enabled,
  });
}

export function useMentorDocuments(mentorId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.documents(mentorId) });
  const query = useQuery({
    queryKey: keys.documents(mentorId),
    queryFn: () => listMentorDocuments(mentorId),
    enabled,
  });
  const upload = useMutation({
    mutationFn: ({ documentType, file, notes }: { documentType: MentorDocumentType; file: File; notes?: string }) =>
      uploadMentorDocument(mentorId, documentType, file, notes),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (documentId: string) => deleteMentorDocument(documentId),
    onSuccess: invalidate,
  });
  return { ...query, upload, remove };
}
