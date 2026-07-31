import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { generateCareerGuidance, listCareerGuidanceReports, listRecommendedCourses } from "@/services/career-guidance.service";

const careerGuidanceKeys = {
  reports: (studentId: string) => ["career-guidance", "reports", studentId] as const,
  courses: (courseIds: string[]) => ["career-guidance", "courses", courseIds] as const,
};

export function useCareerGuidanceReports() {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: careerGuidanceKeys.reports(studentId ?? ""),
    queryFn: () => listCareerGuidanceReports(studentId ?? ""),
    enabled: !!studentId,
  });
}

export function useGenerateCareerGuidance() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetRole: string) => generateCareerGuidance(targetRole),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: careerGuidanceKeys.reports(studentId ?? "") }),
  });
}

export function useRecommendedCourses(courseIds: string[]) {
  return useQuery({
    queryKey: careerGuidanceKeys.courses(courseIds),
    queryFn: () => listRecommendedCourses(courseIds),
    enabled: courseIds.length > 0,
  });
}
