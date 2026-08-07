import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMentorProfileId,
  getMentorAccountStatus,
  getMentorDashboardMetrics,
  getMentorCoursesList,
  getMentorStudentsList,
  getMentorAnalyticsList,
  getMentorProfile,
  updateMentorProfile,
} from "@/services/mentor-portal.service";
import {
  createCourse,
  duplicateMentorCourse,
  getCourseById,
  updateCourse,
  listCourseCategories,
  listMyCategoryProposals,
  proposeCategory,
  getCourseCompleteness,
  submitCourseForReview,
  withdrawCourseSubmission,
  archiveMentorCourse,
  type CourseInput,
  type CategoryInput,
} from "@/services/courses.service";
import {
  replaceCourseMediaFile,
  removeCourseMediaFile,
  resolveCourseMediaUrl,
  type CourseMediaField,
} from "@/services/course-media.service";
import {
  getCourseCurriculum,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  createResource,
  deleteResource,
  type ModuleInput,
  type LessonInput,
  type ResourceInput,
} from "@/services/curriculum.service";
import type { Inserts, Updates } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";
import {
  listMentorExperience,
  createMentorExperience,
  updateMentorExperience,
  deleteMentorExperience,
  reorderMentorExperience,
  listMentorProjects,
  createMentorProject,
  updateMentorProject,
  deleteMentorProject,
  reorderMentorProjects,
  listMentorCertifications,
  createMentorCertification,
  updateMentorCertification,
  deleteMentorCertification,
  reorderMentorCertifications,
  listMentorAchievements,
  createMentorAchievement,
  updateMentorAchievement,
  deleteMentorAchievement,
  reorderMentorAchievements,
  type MentorExperienceInput,
  type MentorProjectInput,
  type MentorCertificationInput,
  type MentorAchievementInput,
} from "@/services/mentor-profile-content.service";
import {
  listMentorAvailability,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  type AvailabilityInput,
} from "@/services/mentor-availability.service";
import { listMentorUpcomingSessions, cancelBooking } from "@/services/mentor-booking.service";
import { listMentorTestimonials, replyToTestimonial } from "@/services/testimonials.service";
import { crmService, type Task } from "@/services/crm.service";
import {
  getOrCreateLessonQuiz,
  updateQuiz,
  listQuizQuestions,
  createQuestionWithOptions,
  deleteQuestion,
  type NewQuestionInput,
} from "@/services/quiz-authoring.service";
import { notificationsService } from "@/services/notifications.service";

export const mentorQueryKeys = {
  profileId: (userId: string) => ["mentor", "profileId", userId] as const,
  dashboardMetrics: (mentorId: string) => ["mentor", "dashboard", "metrics", mentorId] as const,
  courses: (mentorId: string) => ["mentor", "courses", mentorId] as const,
  students: (mentorId: string) => ["mentor", "students", mentorId] as const,
  analytics: (mentorId: string) => ["mentor", "analytics", mentorId] as const,
  curriculum: (courseId: string) => ["mentor", "curriculum", courseId] as const,
  course: (courseId: string) => ["mentor", "course", courseId] as const,
  courseCompleteness: (courseId: string) => ["mentor", "course-completeness", courseId] as const,
  categories: () => ["categories", "list"] as const,
  myCategoryProposals: () => ["categories", "my-proposals"] as const,
  experience: (mentorId: string) => ["mentor", "experience", mentorId] as const,
  projects: (mentorId: string) => ["mentor", "projects", mentorId] as const,
  certifications: (mentorId: string) => ["mentor", "certifications", mentorId] as const,
  achievements: (mentorId: string) => ["mentor", "achievements", mentorId] as const,
  availability: (mentorId: string) => ["mentor", "availability", mentorId] as const,
  upcomingSessions: (mentorId: string) => ["mentor", "upcomingSessions", mentorId] as const,
  testimonials: (mentorId: string) => ["mentor", "testimonials", mentorId] as const,
  tasks: (mentorId: string) => ["mentor", "tasks", mentorId] as const,
};

export function useMentorProfileId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: mentorQueryKeys.profileId(user?.id || ""),
    queryFn: () => getMentorProfileId(user?.id || ""),
    enabled: !!user?.id,
  });
}

/** Real enforcement for admin Suspend/Delete actions (BUG-06) - not just a cosmetic status badge. */
export function useMentorAccountStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor", "accountStatus", user?.id || ""],
    queryFn: () => getMentorAccountStatus(user?.id || ""),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useMentorDashboardMetrics() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.dashboardMetrics(mentorId || ""),
    queryFn: () => getMentorDashboardMetrics(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useMentorProfile() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: ["mentor", "profile", mentorId || ""],
    queryFn: () => getMentorProfile(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useUpdateMentorProfile() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Updates<"mentor_profiles">) => updateMentorProfile(mentorId || "", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor", "profile", mentorId || ""] });
    },
  });
}

export function useMentorCourses() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.courses(mentorId || ""),
    queryFn: () => getMentorCoursesList(mentorId || ""),
    enabled: !!mentorId,
  });
}

/** Mentors create courses under their own mentor_id - enforced both here and by the "Mentors create own courses" RLS policy. */
export function useCreateMentorCourse() {
  const { user } = useAuth();
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CourseInput, "mentor_id">) => {
      if (!user?.id) throw new Error("Not authenticated.");
      return createCourse({ ...input, mentor_id: user.id, status: input.status ?? "draft" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courses(mentorId || "") });
    },
  });
}

export function useDuplicateMentorCourse() {
  const { user } = useAuth();
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => {
      if (!user?.id) throw new Error("Not authenticated.");
      return duplicateMentorCourse(courseId, user.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courses(mentorId || "") });
    },
  });
}

/** A single course, for the edit route. RLS is the authority on ownership - this just fetches by id, `getCourseById` throws if the row is unreachable under RLS. */
export function useMentorCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: mentorQueryKeys.course(courseId || ""),
    queryFn: () => getCourseById(courseId || ""),
    enabled: !!courseId,
    retry: false,
  });
}

export function useCourseCategories() {
  return useQuery({
    queryKey: mentorQueryKeys.categories(),
    queryFn: () => listCourseCategories(),
    staleTime: 5 * 60_000,
  });
}

/** The calling mentor's own pending/rejected category proposals - shown inline in the Course Builder so they aren't left wondering what happened to a proposal. */
export function useMyCategoryProposals() {
  return useQuery({
    queryKey: mentorQueryKeys.myCategoryProposals(),
    queryFn: () => listMyCategoryProposals(),
    staleTime: 30_000,
  });
}

/**
 * Propose a new category/subcategory. Always lands as 'pending' - enforced
 * by the enforce_category_proposal_ownership database trigger, not this
 * hook. Invalidates the mentor's own proposal list so it shows up
 * immediately (RLS lets a mentor see their own pending/rejected rows, just
 * not other mentors' or the public catalog's).
 */
export function useProposeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput & { reason?: string }) => proposeCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.myCategoryProposals() });
    },
  });
}

export function useCourseCompleteness(courseId: string | undefined) {
  return useQuery({
    queryKey: mentorQueryKeys.courseCompleteness(courseId || ""),
    queryFn: () => getCourseCompleteness(courseId || ""),
    enabled: !!courseId,
  });
}

/** The most recent admin "sent back for changes" reason for this course, if any - courses has no rejection_reason column, so this reuses the notification useRejectCourse() already sends. Only meaningful while the course is back in draft. */
export function useCourseRejectionFeedback(courseId: string | undefined) {
  return useQuery({
    queryKey: ["mentor", "course-rejection-feedback", courseId || ""],
    queryFn: async () => {
      const result = await notificationsService.getLatestCourseRejectionReason(courseId!);
      if (!result.success) throw result.error;
      return result.data;
    },
    enabled: !!courseId,
    staleTime: 30_000,
  });
}

/** Mentor-facing basic info / pricing / outcomes edits - status transitions go through the dedicated hooks below instead. */
export function useUpdateMentorCourse(courseId: string | undefined) {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Updates<"courses"> & { selectedCategoryIds?: string[] }) => updateCourse(courseId || "", input),
    onSuccess: () => {
      if (courseId) {
        void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.course(courseId) });
        void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courseCompleteness(courseId) });
      }
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courses(mentorId || "") });
    },
  });
}

export function useSubmitCourseForReview(courseId: string | undefined) {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitCourseForReview(courseId || ""),
    onSuccess: () => {
      if (courseId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.course(courseId) });
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courses(mentorId || "") });
    },
  });
}

export function useWithdrawCourseSubmission(courseId: string | undefined) {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => withdrawCourseSubmission(courseId || ""),
    onSuccess: () => {
      if (courseId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.course(courseId) });
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courses(mentorId || "") });
    },
  });
}

export function useArchiveMentorCourse() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => archiveMentorCourse(courseId),
    onSuccess: (_data, courseId) => {
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.course(courseId) });
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courses(mentorId || "") });
    },
  });
}

export function useCourseMediaMutations(courseId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (courseId) {
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.course(courseId) });
      void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.courseCompleteness(courseId) });
    }
  };

  return {
    replace: useMutation({
      mutationFn: ({ field, file }: { field: CourseMediaField; file: File }) => replaceCourseMediaFile(courseId || "", field, file),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (field: CourseMediaField) => removeCourseMediaFile(courseId || "", field),
      onSuccess: invalidate,
    }),
  };
}

export function useCourseMediaUrl(fileId: string | null | undefined) {
  return useQuery({
    queryKey: ["mentor", "course-media-url", fileId || ""],
    queryFn: () => resolveCourseMediaUrl(fileId || null),
    enabled: !!fileId,
    staleTime: 55 * 60_000, // signed URLs are valid ~1h; avoid refetching mid-session
  });
}

export function useMentorStudents() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.students(mentorId || ""),
    queryFn: () => getMentorStudentsList(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useMentorAnalytics() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.analytics(mentorId || ""),
    queryFn: () => getMentorAnalyticsList(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useCourseCurriculum(courseId: string | undefined) {
  return useQuery({
    queryKey: mentorQueryKeys.curriculum(courseId || ""),
    queryFn: () => getCourseCurriculum(courseId || ""),
    enabled: !!courseId,
  });
}

export function useCurriculumMutations(courseId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (courseId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.curriculum(courseId) });
  };

  return {
    createModule: useMutation({ mutationFn: (input: ModuleInput) => createModule(input), onSuccess: invalidate }),
    updateModule: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"modules"> }) => updateModule(id, input),
      onSuccess: invalidate,
    }),
    deleteModule: useMutation({ mutationFn: (id: string) => deleteModule(id), onSuccess: invalidate }),
    reorderModules: useMutation({
      mutationFn: (orderedModuleIds: string[]) => reorderModules(courseId || "", orderedModuleIds),
      onSuccess: invalidate,
    }),
    createLesson: useMutation({ mutationFn: (input: LessonInput) => createLesson(input), onSuccess: invalidate }),
    updateLesson: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"lessons"> }) => updateLesson(id, input),
      onSuccess: invalidate,
    }),
    deleteLesson: useMutation({ mutationFn: (id: string) => deleteLesson(id), onSuccess: invalidate }),
    reorderLessons: useMutation({
      mutationFn: ({ moduleId, orderedLessonIds }: { moduleId: string; orderedLessonIds: string[] }) =>
        reorderLessons(moduleId, orderedLessonIds),
      onSuccess: invalidate,
    }),
    createResource: useMutation({ mutationFn: (input: ResourceInput) => createResource(input), onSuccess: invalidate }),
    deleteResource: useMutation({ mutationFn: (id: string) => deleteResource(id), onSuccess: invalidate }),
  };
}

// ─── Experience ───────────────────────────────────────────────────────────────

export function useMentorExperience() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.experience(mentorId || ""),
    queryFn: () => listMentorExperience(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useMentorExperienceMutations() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (mentorId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.experience(mentorId) });
  };

  return {
    create: useMutation({ mutationFn: (input: MentorExperienceInput) => createMentorExperience(input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"mentor_experience"> }) => updateMentorExperience(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteMentorExperience(id), onSuccess: invalidate }),
    reorder: useMutation({
      mutationFn: (orderedIds: string[]) => reorderMentorExperience(mentorId || "", orderedIds),
      onSuccess: invalidate,
    }),
  };
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useMentorProjects() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.projects(mentorId || ""),
    queryFn: () => listMentorProjects(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useMentorProjectMutations() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (mentorId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.projects(mentorId) });
  };

  return {
    create: useMutation({ mutationFn: (input: MentorProjectInput) => createMentorProject(input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"mentor_projects"> }) => updateMentorProject(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteMentorProject(id), onSuccess: invalidate }),
    reorder: useMutation({
      mutationFn: (orderedIds: string[]) => reorderMentorProjects(mentorId || "", orderedIds),
      onSuccess: invalidate,
    }),
  };
}

// ─── Certifications ───────────────────────────────────────────────────────────

export function useMentorCertifications() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.certifications(mentorId || ""),
    queryFn: () => listMentorCertifications(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useMentorCertificationMutations() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (mentorId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.certifications(mentorId) });
  };

  return {
    create: useMutation({ mutationFn: (input: MentorCertificationInput) => createMentorCertification(input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"mentor_certifications"> }) => updateMentorCertification(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteMentorCertification(id), onSuccess: invalidate }),
    reorder: useMutation({
      mutationFn: (orderedIds: string[]) => reorderMentorCertifications(mentorId || "", orderedIds),
      onSuccess: invalidate,
    }),
  };
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export function useMentorAchievements() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.achievements(mentorId || ""),
    queryFn: () => listMentorAchievements(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useMentorAchievementMutations() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (mentorId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.achievements(mentorId) });
  };

  return {
    create: useMutation({ mutationFn: (input: MentorAchievementInput) => createMentorAchievement(input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"mentor_achievements"> }) => updateMentorAchievement(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteMentorAchievement(id), onSuccess: invalidate }),
    reorder: useMutation({
      mutationFn: (orderedIds: string[]) => reorderMentorAchievements(mentorId || "", orderedIds),
      onSuccess: invalidate,
    }),
  };
}

// ─── Availability ─────────────────────────────────────────────────────────────

export function useMentorAvailability() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.availability(mentorId || ""),
    queryFn: () => listMentorAvailability(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useMentorAvailabilityMutations() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (mentorId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.availability(mentorId) });
  };

  return {
    create: useMutation({ mutationFn: (input: AvailabilityInput) => createAvailabilitySlot(input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Inserts<"availability"> }) => updateAvailabilitySlot(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteAvailabilitySlot(id), onSuccess: invalidate }),
  };
}

// ─── Upcoming sessions (mentor-side) ─────────────────────────────────────────

export function useMentorUpcomingSessions() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.upcomingSessions(mentorId || ""),
    queryFn: () => listMentorUpcomingSessions(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useCancelMentorSession() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => cancelBooking(meetingId),
    onSuccess: () => {
      if (mentorId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.upcomingSessions(mentorId) });
    },
  });
}

// ─── Tasks (admin-assigned, mentor-side) ─────────────────────────────────────

export function useMentorOwnTasks() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.tasks(mentorId || ""),
    queryFn: async () => {
      const result = await crmService.listTasks({ assigneeId: mentorId || "" });
      if (!result.success) throw result.error;
      return result.data;
    },
    enabled: !!mentorId,
  });
}

export function useUpdateMentorTaskStatus() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Task["status"] }) => {
      const result = await crmService.updateTask(id, { status, completed_at: status === "completed" ? new Date().toISOString() : null });
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      if (mentorId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.tasks(mentorId) });
    },
  });
}

// ─── Reviews (reply to testimonials) ─────────────────────────────────────────

export function useMentorTestimonials() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.testimonials(mentorId || ""),
    queryFn: () => listMentorTestimonials(mentorId || ""),
    enabled: !!mentorId,
  });
}

export function useReplyToTestimonial() {
  const { data: mentorId } = useMentorProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => replyToTestimonial(id, reply),
    onSuccess: () => {
      if (mentorId) void queryClient.invalidateQueries({ queryKey: mentorQueryKeys.testimonials(mentorId) });
    },
  });
}

// ─── Quiz authoring (mentor-side mock-test question builder) ────────────────

export function useLessonQuiz(courseId: string, lessonId: string, lessonTitle: string) {
  return useQuery({
    queryKey: ["mentor", "quiz", lessonId],
    queryFn: () => getOrCreateLessonQuiz(courseId, lessonId, lessonTitle),
    enabled: !!courseId && !!lessonId,
  });
}

export function useQuizQuestions(quizId: string | undefined) {
  return useQuery({
    queryKey: ["mentor", "quiz-questions", quizId ?? ""],
    queryFn: () => listQuizQuestions(quizId ?? ""),
    enabled: !!quizId,
  });
}

export function useQuizAuthoringMutations(quizId: string | undefined, lessonId: string) {
  const queryClient = useQueryClient();
  const invalidateQuestions = () => void queryClient.invalidateQueries({ queryKey: ["mentor", "quiz-questions", quizId ?? ""] });

  return {
    updatePublishState: useMutation({
      mutationFn: (input: Updates<"quizzes">) => updateQuiz(quizId ?? "", input),
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["mentor", "quiz", lessonId] }),
    }),
    createQuestion: useMutation({
      mutationFn: (input: NewQuestionInput) => createQuestionWithOptions(input),
      onSuccess: invalidateQuestions,
    }),
    deleteQuestion: useMutation({
      mutationFn: (questionId: string) => deleteQuestion(questionId),
      onSuccess: invalidateQuestions,
    }),
  };
}
