import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trophy, CreditCard, MessageSquare, ClipboardList, Megaphone, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, notificationKeys } from "@/hooks/student/useNotifications";
import { notificationsService, type Notification } from "@/services/notifications.service";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_ICONS: Record<Notification["category"], typeof Bell> = {
  course: ClipboardList,
  payment: CreditCard,
  message: MessageSquare,
  assignment: ClipboardList,
  certificate: Trophy,
  system: Info,
  general: Megaphone,
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading, unreadCount, markRead, markAllRead } = useNotifications(10);

  useEffect(() => {
    if (!user?.id) return;
    const channel = notificationsService.subscribeToNotifications(user.id, () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list(user.id) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) });
    });
    return () => notificationsService.unsubscribe(channel);
  }, [user?.id, queryClient]);

  const handleSelect = (notification: Notification) => {
    if (notification.status === "unread") {
      markRead.mutate(notification.id);
    }
    if (notification.action_url) {
      void navigate(notification.action_url);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}>
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2.5 items-center justify-center rounded-full bg-destructive ring-2 ring-card" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-black">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 rounded text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="size-8 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground">You don&apos;t have any notifications yet.</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = CATEGORY_ICONS[notification.category] ?? Bell;
              const isUnread = notification.status === "unread";
              return (
                <button
                  key={notification.id}
                  onClick={() => handleSelect(notification)}
                  aria-label={`${notification.title}. ${notification.body}${isUnread ? " (unread)" : ""}`}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${isUnread ? "bg-primary/5" : ""}`}
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`truncate text-sm ${isUnread ? "font-black text-foreground" : "font-semibold text-foreground/80"}`}>
                        {notification.title}
                      </span>
                      {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.body}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground/70">{timeAgo(notification.created_at)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
