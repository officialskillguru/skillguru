import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/services/student.service";
import { useAuth } from "@/hooks/useAuth";
import { continueLearningService } from "@/services/continue-learning.service";


export function useStudentDashboard() {
  const { user } = useAuth();
  const studentId = user?.id;

  const statsQuery = useQuery({
    queryKey: ["student-stats", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await studentService.getDashboardStats(studentId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!studentId,
  });

  const continueLearningQuery = useQuery({
    queryKey: ["continue-learning", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await continueLearningService.getContinueLearning(studentId);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!studentId,
  });

  return {
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    statsError: statsQuery.error,
    
    continueLearning: continueLearningQuery.data,
    isLoadingContinueLearning: continueLearningQuery.isLoading,
    continueLearningError: continueLearningQuery.error,
  };
}
