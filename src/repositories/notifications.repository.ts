import { BaseRepository, type PaginatedResponse, type PaginationOptions } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, type AppError, ok } from "@/utils/result";
import type { Database } from "@/types/database.types";

type NotificationRow = Database["public"]["Tables"]["courses"]["Row"];

export class NotificationsRepository extends BaseRepository<"courses"> {
  constructor() {
    super(supabase, "courses");
  }

  async search(_query: string, _options: PaginationOptions): Promise<Result<PaginatedResponse<NotificationRow>, AppError>> {
    return ok({ data: [], count: 0, page: 1, limit: 10, totalPages: 0 });
  }

  async getUserNotifications(_userId: string, _options?: { page: number; limit: number }): Promise<Result<PaginatedResponse<NotificationRow>, AppError>> {
    return ok({ data: [], count: 0, page: 1, limit: 10, totalPages: 0 });
  }

  async markAsRead(_id: string): Promise<Result<void>> { return ok(undefined); }
  async markAllAsRead(_userId: string): Promise<Result<void>> { return ok(undefined); }
  async getUnreadCount(_userId: string): Promise<Result<number>> { return ok(0); }
}

export const notificationsRepository = new NotificationsRepository();
