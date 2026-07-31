import { getExtendedSupabaseClient } from "./_shared";
import { type Result, ok, fail, DatabaseError } from "@/utils/result";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================
// Note: the `notifications` table has no dedicated `category`/`action_url`
// columns. They are persisted inside `metadata` (JSON) and translated back
// out by rowToNotification() below, so the rest of the app can keep using a
// stable, richer Notification shape without a schema migration.
export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  status: "unread" | "read";
  category: "course" | "payment" | "message" | "assignment" | "certificate" | "system" | "general";
  action_url: string | null;
  read_at: string | null;
  metadata: Record<string, unknown>;
  sender_id: string | null;
  created_at: string;
  sender?: { full_name: string } | null;
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  sender?: { full_name: string } | null;
}

function rowToNotification(row: NotificationRow): Notification {
  const metadata = row.metadata ?? {};
  const { category, action_url, ...restMetadata } = metadata as {
    category?: Notification["category"];
    action_url?: string | null;
    [key: string]: unknown;
  };
  return {
    id: row.id,
    recipient_id: row.recipient_id,
    sender_id: row.sender_id,
    type: row.type,
    title: row.title,
    body: row.message,
    status: row.is_read ? "read" : "unread",
    category: category ?? "general",
    action_url: action_url ?? null,
    read_at: row.read_at,
    metadata: restMetadata,
    created_at: row.created_at,
    sender: row.sender ?? null,
  };
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  course_updates: boolean;
  assignment_alerts: boolean;
  payment_alerts: boolean;
  chat_messages: boolean;
  announcements: boolean;
  certificate_alerts: boolean;
  system_alerts: boolean;
}

// ============================================================================
// Notifications Service (canonical)
// ============================================================================
export const notificationsService = {
  // --------------------------------------------------------------------------
  // Get notifications for current user
  // --------------------------------------------------------------------------
  async getNotifications(limit = 30, offset = 0): Promise<Result<Notification[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      const { data, error } = await supabase
        .from("notifications")
        .select("*, sender:profiles!notifications_sender_id_fkey(full_name)")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(((data as unknown as NotificationRow[]) ?? []).map(rowToNotification));
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notifications_list"));
    }
  },

  // --------------------------------------------------------------------------
  // Get unread count
  // --------------------------------------------------------------------------
  async getUnreadCount(): Promise<Result<number>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return ok(0);

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(count ?? 0);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notifications_count"));
    }
  },

  // --------------------------------------------------------------------------
  // Mark as read
  // --------------------------------------------------------------------------
  async markAsRead(notificationId: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notification_mark_read"));
    }
  },

  // --------------------------------------------------------------------------
  // Mark all as read
  // --------------------------------------------------------------------------
  async markAllAsRead(): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notification_mark_all_read"));
    }
  },

  // --------------------------------------------------------------------------
  // Send notification to user (admin/system)
  // --------------------------------------------------------------------------
  async sendNotification(
    recipientId: string,
    title: string,
    body: string,
    options: {
      type?: string;
      category?: Notification["category"];
      actionUrl?: string;
      metadata?: Record<string, unknown>;
      senderId?: string;
    } = {}
  ): Promise<Result<Notification>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          recipient_id: recipientId,
          title,
          message: body,
          type: options.type ?? "general",
          metadata: {
            ...(options.metadata ?? {}),
            category: options.category ?? "general",
            action_url: options.actionUrl ?? null,
          },
          sender_id: options.senderId ?? null,
          is_read: false,
        })
        .select()
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(rowToNotification(data as unknown as NotificationRow));
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notification_send"));
    }
  },

  // --------------------------------------------------------------------------
  // Broadcast to all users (admin only)
  // --------------------------------------------------------------------------
  async broadcastNotification(
    title: string,
    body: string,
    targetRole?: string, // undefined = all users
    category: Notification["category"] = "general"
  ): Promise<Result<{ sent: number }>> {
    try {
      const supabase = getExtendedSupabaseClient();

      let recipientQuery = supabase.from("profiles").select("id");

      if (targetRole) {
        const { data: role } = await supabase
          .from("roles")
          .select("id")
          .eq("code", targetRole)
          .single();

        if (role) {
          const { data: userRoles } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role_id", (role).id);

          const userIds = (userRoles ?? []).map((ur: { user_id: string }) => ur.user_id);
          recipientQuery = recipientQuery.in("id", userIds);
        }
      }

      const { data: recipients } = await recipientQuery;
      if (!recipients || recipients.length === 0) return ok({ sent: 0 });

      const notifications = (recipients as { id: string }[]).map((r) => ({
        recipient_id: r.id,
        title,
        message: body,
        type: "broadcast",
        is_read: false,
        metadata: { category },
      }));

      // Insert in batches of 100
      let sent = 0;
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error } = await supabase.from("notifications").insert(batch);
        if (!error) sent += batch.length;
      }

      return ok({ sent });
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notification_broadcast"));
    }
  },

  // --------------------------------------------------------------------------
  // Delete notification
  // --------------------------------------------------------------------------
  async deleteNotification(notificationId: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notification_delete"));
    }
  },

  // --------------------------------------------------------------------------
  // Preferences
  // --------------------------------------------------------------------------
  async getPreferences(): Promise<Result<NotificationPreferences>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(data as NotificationPreferences);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notification_prefs_get"));
    }
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<Result<NotificationPreferences>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      const { data, error } = await supabase
        .from("notification_preferences")
        .update(prefs as never)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(data as NotificationPreferences);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "notification_prefs_update"));
    }
  },

  // --------------------------------------------------------------------------
  // Realtime subscription
  // --------------------------------------------------------------------------
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ): RealtimeChannel {
    const supabase = getExtendedSupabaseClient();
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: { new: NotificationRow }) => {
          onNotification(rowToNotification(payload.new));
        }
      )
      .subscribe();
  },

  unsubscribe(channel: RealtimeChannel): void {
    const supabase = getExtendedSupabaseClient();
    void supabase.removeChannel(channel);
  },
};
