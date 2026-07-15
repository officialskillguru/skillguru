import { useQuery } from "@tanstack/react-query";
import {
  getMentorProfileId,
  getMentorDashboardMetrics,
  getMentorCoursesList,
  getMentorStudentsList,
  getMentorAnalyticsList,
} from "@/services/mentor-portal.service";
import { useAuth } from "@/hooks/useAuth";

export const mentorQueryKeys = {
  profileId: (userId: string) => ["mentor", "profileId", userId] as const,
  dashboardMetrics: (mentorId: string) => ["mentor", "dashboard", "metrics", mentorId] as const,
  courses: (mentorId: string) => ["mentor", "courses", mentorId] as const,
  students: (mentorId: string) => ["mentor", "students", mentorId] as const,
  analytics: (mentorId: string) => ["mentor", "analytics", mentorId] as const,
};

export function useMentorProfileId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: mentorQueryKeys.profileId(user?.id || ""),
    queryFn: () => getMentorProfileId(user?.id || ""),
    enabled: !!user?.id,
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

export function useMentorCourses() {
  const { data: mentorId } = useMentorProfileId();
  return useQuery({
    queryKey: mentorQueryKeys.courses(mentorId || ""),
    queryFn: () => getMentorCoursesList(mentorId || ""),
    enabled: !!mentorId,
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
