
import { type Result, ok } from "@/utils/result";

export class NotificationService {
  async markRead(_id: string): Promise<Result<void>> {
    return ok(undefined);
  }

  async markAllRead(_userId: string): Promise<Result<void>> {
    return ok(undefined);
  }

  async deleteNotification(_id: string): Promise<Result<void>> {
    return ok(undefined);
  }

  async archiveNotification(_id: string): Promise<Result<void>> {
    return ok(undefined);
  }
}

export const notificationService = new NotificationService();

