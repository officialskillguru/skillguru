import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/services/notifications.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const notificationKeys = {
  list: (userId: string | undefined) => ["notifications", userId] as const,
  unreadCount: (userId: string | undefined) => ["notifications-unread-count", userId] as const,
};

export function useNotifications(limit: number = 20) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: async () => {
      const res = await notificationsService.getNotifications(limit, 0);
      if (!res.success) throw res.error;
      return res.data;
    },
    enabled: !!userId,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    queryFn: async () => {
      const res = await notificationsService.getUnreadCount();
      if (!res.success) return 0;
      return res.data;
    },
    enabled: !!userId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
    void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) });
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await notificationsService.markAsRead(id);
      if (!res.success) throw res.error;
    },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await notificationsService.markAllAsRead();
      if (!res.success) throw res.error;
    },
    onSuccess: invalidate,
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const res = await notificationsService.deleteNotification(id);
      if (!res.success) throw res.error;
    },
    onSuccess: () => {
      toast.success("Notification deleted");
      invalidate();
    },
  });

  return {
    ...query,
    unreadCount: unreadCountQuery.data ?? 0,
    markRead,
    markAllRead,
    deleteNotification,
  };
}
