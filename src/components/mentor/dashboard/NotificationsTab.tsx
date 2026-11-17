import {
  Bell,
  CheckCheck,
  Trophy,
  CreditCard,
  MessageSquare,
  ClipboardList,
  Megaphone,
  Info,
  FolderTree,
  Briefcase,
} from "lucide-react";
import { useNotifications } from "@/hooks/student/useNotifications";
import type { Notification } from "@/services/notifications.service";

const NOTIFICATION_CATEGORY_ICONS: Record<Notification["category"], typeof Bell> = {
  course: ClipboardList,
  category_proposal: FolderTree,
  payment: CreditCard,
  message: MessageSquare,
  assignment: ClipboardList,
  certificate: Trophy,
  placement: Briefcase,
  system: Info,
  general: Megaphone,
};

export function NotificationsTab() {
  const {
    data: notifications = [],
    isLoading,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotifications(30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-black">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-primary focus-visible:ring-primary flex items-center gap-1.5 rounded text-xs font-bold hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" aria-hidden="true" /> Mark all read
          </button>
        )}
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-16 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <Bell className="text-muted-foreground mx-auto size-12" aria-hidden="true" />
              <h3 className="text-foreground mt-4 text-lg font-black">All Caught Up</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                You don&apos;t have any new notifications.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {notifications.map((notification) => {
              const Icon = NOTIFICATION_CATEGORY_ICONS[notification.category] ?? Bell;
              const isUnread = notification.status === "unread";
              return (
                <button
                  key={notification.id}
                  onClick={() => isUnread && markRead.mutate(notification.id)}
                  aria-label={`${notification.title}. ${notification.body}${isUnread ? " (unread)" : ""}`}
                  className={`hover:bg-muted/30 focus-visible:ring-primary flex w-full items-start gap-3 px-5 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${isUnread ? "bg-primary/5" : ""}`}
                >
                  <span className="bg-secondary/10 text-secondary mt-0.5 grid size-9 shrink-0 place-items-center rounded-full">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`text-sm ${isUnread ? "text-foreground font-black" : "text-foreground/80 font-semibold"}`}
                      >
                        {notification.title}
                      </span>
                      {isUnread && (
                        <span
                          className="bg-primary size-1.5 shrink-0 rounded-full"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-sm">
                      {notification.body}
                    </span>
                    <span className="text-muted-foreground/70 mt-1 block text-xs">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
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
