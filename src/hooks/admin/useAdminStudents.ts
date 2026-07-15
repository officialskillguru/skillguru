import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type { StudentFilters } from "@/repositories/admin.repository";
import type { PaginationOptions } from "@/repositories/base.repository";

export function useAdminStudents(filters: StudentFilters, options: PaginationOptions) {
  return useQuery({
    queryKey: ["admin_students", filters, options],
    queryFn: async () => {
      const result = await adminService.getStudents(filters, options);
      if (!result.success) throw result.error;
      return result.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useUpdateStudentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: string }) => {
      const result = await adminService.updateStudentStatus(studentId, status);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin_students"] });
    },
  });
}

export function useBulkUpdateStudentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentIds, status }: { studentIds: string[]; status: string }) => {
      const result = await adminService.bulkUpdateStudentStatus(studentIds, status);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin_students"] });
    },
  });
}
