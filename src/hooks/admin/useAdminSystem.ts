import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
const listAuditLogs = async (params?: unknown) => []; type AuditLogListParams = unknown;
import { broadcastNotification } from "@/services/notifications.service";

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery({
    queryKey: ["audit_logs", params],
    queryFn: async () => {
      return await listAuditLogs(params);
    },
    placeholderData: keepPreviousData,
  });
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: async ({ title, message, type }: { title: string; message: string; type?: string }) => {
      return await broadcastNotification(title, message, type);
    }
  });
}
