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
  createLead,
  listLeads,
  updateLead,
  type LeadListParams,
} from "@/services/crm.service";
import { getDashboardChartData, getDashboardMetrics, getDashboardRecent } from "@/services/dashboard.service";
import {
  createMentor,
  listMentors,
  updateMentor,
  type MentorListParams,
} from "@/services/mentors.service";
import {
  createStudent,
  listStudents,
  updateStudent,
  type StudentListParams,
} from "@/services/students.service";
import {
  createSuccessStory,
  listSuccessStories,
  updateSuccessStory,
  type SuccessStoryInput,
  type SuccessStoryListParams,
} from "@/services/successStories.service";

export const adminQueryKeys = {
  courses: (params: CourseListParams) => ["admin", "courses", params] as const,
  courseCategories: ["admin", "course-categories"] as const,
  mentors: (params: MentorListParams) => ["admin", "mentors", params] as const,
  students: (params: StudentListParams) => ["admin", "students", params] as const,
  leads: (params: LeadListParams) => ["admin", "leads", params] as const,
  successStories: (params: SuccessStoryListParams) => ["admin", "success-stories", params] as const,
  dashboardMetrics: ["admin", "dashboard", "metrics"] as const,
  dashboardRecent: ["admin", "dashboard", "recent"] as const,
  dashboardCharts: ["admin", "dashboard", "charts"] as const,
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
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "mentors"] });

  return {
    create: useMutation({ mutationFn: createMentor, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"mentors"> }) => updateMentor(id, input),
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
      mutationFn: ({ id, input }: { id: string; input: Updates<"students"> }) => updateStudent(id, input),
      onSuccess: invalidate,
    }),
  };
}

export function useLeads(params: LeadListParams = {}) {
  return useQuery({
    queryKey: adminQueryKeys.leads(params),
    queryFn: () => listLeads(params),
  });
}

export function useLeadMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });

  return {
    create: useMutation({ mutationFn: createLead, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"leads"> }) => updateLead(id, input),
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
    create: useMutation({ mutationFn: (input: SuccessStoryInput) => createSuccessStory(input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Updates<"success_stories"> }) => updateSuccessStory(id, input),
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
