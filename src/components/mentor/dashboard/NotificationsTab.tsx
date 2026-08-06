import { Bell, CheckCheck, Trophy, CreditCard, MessageSquare, ClipboardList, Megaphone, Info, FolderTree } from "lucide-react";
import { useNotifications } from "@/hooks/student/useNotifications";
import type { Notification } from "@/services/notifications.service";

const NOTIFICATION_CATEGORY_ICONS: Record<Notification["category"], typeof Bell> = {
  course: ClipboardList,
  category_proposal: FolderTree,
  payment: CreditCard,
  message: MessageSquare,
  assignment: ClipboardList,
  certificate: Trophy,
  system: Info,
  general: Megaphone,
};

export function NotificationsTab() {
  const { data: notifications = [], isLoading, unreadCount, markRead, markAllRead } = useNotifications(30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">Notifications</h2>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 rounded text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" aria-hidden="true" /> Mark all read
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <Bell className="mx-auto size-12 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-black text-foreground">All Caught Up</h3>
              <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have any new notifications.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const Icon = NOTIFICATION_CATEGORY_ICONS[notification.category] ?? Bell;
              const isUnread = notification.status === "unread";
              return (
                <button
                  key={notification.id}
                  onClick={() => isUnread && markRead.mutate(notification.id)}
                  aria-label={`${notification.title}. ${notification.body}${isUnread ? " (unread)" : ""}`}
                  className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${isUnread ? "bg-primary/5" : ""}`}
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`text-sm ${isUnread ? "font-black text-foreground" : "font-semibold text-foreground/80"}`}>
                        {notification.title}
                      </span>
                      {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{notification.body}</span>
                    <span className="mt-1 block text-xs text-muted-foreground/70">{new Date(notification.created_at).toLocaleString()}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
