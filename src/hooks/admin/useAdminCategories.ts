import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  listAdminCategories,
  createCategory,
  updateCategory,
  setCategoryStatus,
  approveCategory,
  rejectCategory,
  deleteCategory,
  type AdminCategoryListParams,
  type CategoryInput,
  type CategoryStatus,
} from "@/services/courses.service";
import { notificationsService } from "@/services/notifications.service";

const CATEGORIES_KEY = ["admin_categories"] as const;

export function useAdminCategories(params: AdminCategoryListParams) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, params],
    queryFn: () => listAdminCategories(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) => updateCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useSetCategoryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Extract<CategoryStatus, "active" | "archived"> }) => setCategoryStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useApproveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const category = await approveCategory(id);
      if (category.created_by) {
        await notificationsService.sendNotification(
          category.created_by,
          "Category approved",
          `Your proposed category "${category.name}" has been approved and is now available to select.`,
          { category: "category_proposal", actionUrl: "/mentor/courses/new" }
        );
      }
      return category;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useRejectCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { category } = await rejectCategory(id, reason);
      if (category?.created_by) {
        await notificationsService.sendNotification(
          category.created_by,
          "Category proposal declined",
          `Your proposed category "${category.name}" was not approved: ${reason}`,
          { category: "category_proposal", actionUrl: "/mentor/courses/new" }
        );
      }
      return category;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}
