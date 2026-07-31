import { useMutation } from "@tanstack/react-query";
import { notificationsService } from "@/services/notifications.service";

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: async ({ title, message, targetRole }: { title: string; message: string; targetRole?: string }) => {
      const r = await notificationsService.broadcastNotification(title, message, targetRole);
      if (!r.success) throw r.error;
      return r.data;
    }
  });
}
