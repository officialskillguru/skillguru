import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Send, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { notificationsService, type Notification } from "@/services/notifications.service";
import { GsapReveal } from "@/components/motion/gsap-reveal";

const CATEGORY_COLORS: Record<string, string> = {
  course:      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  payment:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  message:     "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  assignment:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  certificate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  system:      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  general:     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    body: "",
    targetRole: "",
    category: "general" as Notification["category"],
  });

  const broadcast = useMutation({
    mutationFn: async () => {
      const r = await notificationsService.broadcastNotification(
        form.title,
        form.body,
        form.targetRole || undefined,
        form.category
      );
      if (!r.success) throw r.error;
      return r.data;
    },
    onSuccess: (data) => {
      toast.success(`Notification sent to ${data.sent} users`);
      void qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-black text-foreground">Broadcast Notification</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Title *</label>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Notification title…"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Message *</label>
            <textarea
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Your message to users…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Send To</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none"
                value={form.targetRole}
                onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}
              >
                <option value="">All Users</option>
                <option value="student">Students Only</option>
                <option value="mentor">Mentors Only</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Category</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as Notification["category"] }))}
              >
                {["general","course","payment","assignment","certificate","system"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button
            onClick={() => broadcast.mutate()}
            disabled={broadcast.isPending || !form.title || !form.body}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
          >
            <Send className="size-4" />
            {broadcast.isPending ? "Sending…" : "Send Broadcast"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 30;
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications", page],
    queryFn: async () => {
      const r = await notificationsService.getNotifications(PAGE_SIZE, (page - 1) * PAGE_SIZE);
      if (!r.success) return [];
      return r.data;
    },
  });
  const hasNextPage = notifications.length === PAGE_SIZE;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const r = await notificationsService.getUnreadCount();
      if (!r.success) return 0;
      return r.data;
    },
  });

  const qc = useQueryClient();
  const markAllRead = useMutation({
    mutationFn: async () => {
      const r = await notificationsService.markAllAsRead();
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      void qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  return (
    <div className="space-y-6 pb-12">
      <GsapReveal direction="up" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary dark:text-cyan-200">Notifications Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcast notifications to all users or targeted roles.
            {unreadCount > 0 && <span className="ml-2 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-black text-primary-foreground">{unreadCount} unread</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90"
          >
            <Send className="size-4" /> Broadcast
          </button>
        </div>
      </GsapReveal>

      {/* Notification list */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell className="mb-4 size-12 text-muted-foreground" />
            <p className="font-semibold text-foreground">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Use the Broadcast button to send notifications to users.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif: Notification) => {
              const isUnread = notif.status === "unread";
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/30 ${isUnread ? "bg-primary/5" : ""}`}
                >
                  {isUnread && <div className="mt-2 size-2 flex-none rounded-full bg-primary" />}
                  {!isUnread && <div className="mt-2 size-2 flex-none rounded-full bg-transparent" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CATEGORY_COLORS[notif.category] ?? CATEGORY_COLORS.general}`}>
                        {notif.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-foreground">{notif.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{notif.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(page > 1 || hasNextPage) && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Page {page}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted">Prev</button>
            <button disabled={!hasNextPage} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
      </AnimatePresence>
    </div>
  );
}
