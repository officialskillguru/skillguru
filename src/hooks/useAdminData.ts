import { getDashboardMetrics, getDashboardRecent, getDashboardChartData } from "@/services/dashboard.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Updates } from "@/types/database";
import {
  createCourse,
  deleteCourse,
  listCourseCategories,
  listCourses,
  updateCourse,
  type CourseInput,
  type CourseListParams,
} from "@/services/courses.service";
import {
  listAdmins,
  type AdminListParams,
} from "@/services/admins.service";
import {
  crmService,
  type Lead,
} from "@/services/crm.service";

type LeadListParams = Parameters<typeof crmService.listLeads>[0];

import {
  createMentor,
  listMentors,
  updateMentorFull,
  setMentorStatus,
  softDeleteMentor,
  restoreMentor,
  setMentorPassword,
  forceMentorPasswordChange,
  forceMentorLogout,
  lockMentor,
  unlockMentor,
  changeMentorEmail,
  type MentorListParams,
  type MentorFullUpdateInput,
} from "@/services/mentors.service";
import {
  createStudent,
  listStudents,
  updateStudent,
  setStudentPassword,
  forceStudentPasswordChange,
  forceStudentLogout,
  changeStudentEmail,
  type StudentListParams,
} from "@/services/students.service";
import {
  createSuccessStory,
  listSuccessStories,
  updateSuccessStory,
  type SuccessStoryListParams,
} from "@/services/successStories.service";

export const adminQueryKeys = {
  courses: (params: CourseListParams) => ["admin", "courses", params] as const,
  courseCategories: ["admin", "course-categories"] as const,
  mentors: (params: MentorListParams) => ["admin", "mentor_profiles", params] as const,
  students: (params: StudentListParams) => ["admin", "students", params] as const,
  leads: (params: LeadListParams) => ["admin", "leads", params] as const,
  successStories: (params: SuccessStoryListParams) => ["admin", "success-stories", params] as const,
  dashboardMetrics: ["admin", "dashboard", "metrics"] as const,
  dashboardRecent: ["admin", "dashboard", "recent"] as const,
  dashboardCharts: ["admin", "dashboard", "charts"] as const,
  admins: (params: AdminListParams) => ["admin", "admins", params] as const,
};

export function useCourses(params: CourseListParams = {}) {
  return useQuery({
    queryKey: adminQueryKeys.courses(params),
    queryFn: () => listCourses(params),
  });
}

export function useCourseCategories() {
  return useQuery({
    queryKey: adminQueryKeys.courseCategories,
    queryFn: listCourseCategories,
  });
}

export function useCourseMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });

  return {
    create: useMutation({ mutationFn: (input: CourseInput) => createCourse(input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"courses"> }) => updateCourse(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteCourse, onSuccess: invalidate }),
  };
}

export function useMentors(params: MentorListParams = {}) {
  return useQuery({
    queryKey: adminQueryKeys.mentors(params),
    queryFn: () => listMentors(params),
  });
}

export function useMentorMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "mentor_profiles"] });

  return {
    create: useMutation({ mutationFn: createMentor, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: MentorFullUpdateInput }) => updateMentorFull(id, input),
      onSuccess: invalidate,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: "active" | "suspended" }) => setMentorStatus(id, status),
      onSuccess: invalidate,
    }),
    softDelete: useMutation({ mutationFn: (id: string) => softDeleteMentor(id), onSuccess: invalidate }),
    restore: useMutation({ mutationFn: (id: string) => restoreMentor(id), onSuccess: invalidate }),
    setPassword: useMutation({
      mutationFn: ({ id, password }: { id: string; password: string }) => setMentorPassword(id, password),
    }),
    forcePasswordChange: useMutation({ mutationFn: (id: string) => forceMentorPasswordChange(id) }),
    forceLogout: useMutation({ mutationFn: (id: string) => forceMentorLogout(id) }),
    lock: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => lockMentor(id, reason),
      onSuccess: invalidate,
    }),
    unlock: useMutation({ mutationFn: (id: string) => unlockMentor(id), onSuccess: invalidate }),
    changeEmail: useMutation({
      mutationFn: ({ id, newEmail }: { id: string; newEmail: string }) => changeMentorEmail(id, newEmail),
      onSuccess: invalidate,
    }),
  };
}

export function useStudents(params: StudentListParams = {}) {
  return useQuery({
    queryKey: adminQueryKeys.students(params),
    queryFn: () => listStudents(params),
  });
}

export function useStudentMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "students"] });

  return {
    create: useMutation({ mutationFn: createStudent, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"profiles"> }) => updateStudent(id, input),
      onSuccess: invalidate,
    }),
    setPassword: useMutation({
      mutationFn: ({ id, password }: { id: string; password: string }) => setStudentPassword(id, password),
    }),
    forcePasswordChange: useMutation({ mutationFn: (id: string) => forceStudentPasswordChange(id) }),
    forceLogout: useMutation({ mutationFn: (id: string) => forceStudentLogout(id) }),
    changeEmail: useMutation({
      mutationFn: ({ id, newEmail }: { id: string; newEmail: string }) => changeStudentEmail(id, newEmail),
      onSuccess: invalidate,
    }),
  };
}

export function useLeads(params: LeadListParams = {}) {
  return useQuery({
    queryKey: adminQueryKeys.leads(params),
    queryFn: async () => {
      const r = await crmService.listLeads(params);
      if (!r.success) throw r.error;
      return r.data;
    },
  });
}

export function useLeadMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });

  return {
    create: useMutation({
      mutationFn: async (input: Partial<Lead>) => {
        const r = await crmService.createLead(input);
        if (!r.success) throw r.error;
        return r.data;
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, input }: { id: string; input: Partial<Lead> }) => {
        const r = await crmService.updateLead(id, input);
        if (!r.success) throw r.error;
        return r.data;
      },
      onSuccess: invalidate,
    }),
  };
}

export function useSuccessStories(params: SuccessStoryListParams = {}) {
  return useQuery({
    queryKey: adminQueryKeys.successStories(params),
    queryFn: () => listSuccessStories(params),
  });
}

export function useSuccessStoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "success-stories"] });

  return {
    create: useMutation({ mutationFn: (input: Record<string, unknown>) => createSuccessStory(input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: number; input: Record<string, unknown> }) => updateSuccessStory(id, input),
      onSuccess: invalidate,
    }),
  };
}

export function useDashboardData() {
  const metrics = useQuery({ queryKey: adminQueryKeys.dashboardMetrics, queryFn: getDashboardMetrics });
  const recent = useQuery({ queryKey: adminQueryKeys.dashboardRecent, queryFn: getDashboardRecent });
  const charts = useQuery({ queryKey: adminQueryKeys.dashboardCharts, queryFn: getDashboardChartData });

  return { metrics, recent, charts };
}

export function useAdmins(params: unknown = {}) {
  return useQuery({
    queryKey: adminQueryKeys.admins(params),
    queryFn: () => listAdmins(params),
  });
}

