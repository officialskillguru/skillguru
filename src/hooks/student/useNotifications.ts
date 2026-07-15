import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/hooks/useAuth";
import { notificationsRepository } from "@/repositories/notifications.repository";
import { toast } from "sonner";

export function useNotifications(page: number = 1, limit: number = 10) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", userId, page, limit],
    queryFn: async () => {
      if (!userId) return null;
      const res = await notificationsRepository.getUserNotifications(userId, { page, limit });
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!userId,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await notificationService.markRead(id);
      if (!res.success) throw res.error;
      return res.data;
    },
    onMutate: async () => {
      // Optimistic update for unread count in dashboard stats
      await queryClient.cancelQueries({ queryKey: ["student-stats", userId] });
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ["student-stats", userId] }); void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    }
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const res = await notificationService.markAllRead(userId);
      if (!res.success) throw res.error;
      return res.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["student-stats", userId] }); void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    }
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const res = await notificationService.deleteNotification(id);
      if (!res.success) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success("Notification deleted"); void queryClient.invalidateQueries({ queryKey: ["student-stats", userId] }); void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    }
  });

  return {
    ...query,
    markRead,
    markAllRead,
    deleteNotification
  };
}
