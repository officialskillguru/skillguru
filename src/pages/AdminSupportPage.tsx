import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Search, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supportService, type SupportTicket, type TicketMessage } from "@/services/mentor-invite.service";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<string, NonNullable<BadgeProps["variant"]>> = {
  open: "info",
  pending: "warning",
  resolved: "success",
  closed: "muted",
};

const PRIORITY_VARIANTS: Record<string, NonNullable<BadgeProps["variant"]>> = {
  low: "muted",
  medium: "info",
  high: "warning",
  critical: "destructive",
};

function TicketDetail({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-messages", ticket.id],
    queryFn: async () => {
      const r = await supportService.getTicketMessages(ticket.id);
      if (!r.success) return [];
      return r.data;
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      const r = await supportService.addTicketMessage(ticket.id, reply, isInternal);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("Reply sent");
      setReply("");
      void qc.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const r = await supportService.updateTicketStatus(ticket.id, status);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("Ticket status updated");
      void qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-foreground/40 backdrop-blur-sm sm:items-center sm:justify-center p-4">
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={STATUS_VARIANTS[ticket.status] ?? "muted"} className="capitalize">{ticket.status}</Badge>
              <Badge variant={PRIORITY_VARIANTS[ticket.priority] ?? "muted"} className="capitalize">{ticket.priority}</Badge>
            </div>
            <h2 className="mt-2 text-base font-black text-foreground truncate">{ticket.title}</h2>
            <p className="text-xs text-muted-foreground">
              {ticket.student?.full_name} • {new Date(ticket.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <label htmlFor="ticket-status" className="sr-only">Ticket status</label>
            <select
              id="ticket-status"
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={ticket.status}
              onChange={e => updateStatus.mutate(e.target.value)}
            >
              {["open","pending","resolved","closed"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-foreground">{ticket.description}</p>
          </div>
          {messages.map((msg: TicketMessage) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.is_internal ? "opacity-80" : ""}`}
            >
              <div className="size-8 flex-none rounded-full bg-primary/20 flex items-center justify-center text-xs font-black text-primary">
                {msg.author?.full_name?.[0] ?? "?"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{msg.author?.full_name ?? "Unknown"}</span>
                  {msg.is_internal && <Badge variant="warning">Internal</Badge>}
                  <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="mt-1 rounded-xl bg-muted/50 px-4 py-3 text-sm text-foreground">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded" />
              Internal note (hidden from student)
            </label>
          </div>
          <div className="flex gap-2">
            <label htmlFor="ticket-reply" className="sr-only">{isInternal ? "Internal note" : "Reply to student"}</label>
            <textarea
              id="ticket-reply"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={isInternal ? "Add an internal note…" : "Write a reply to the student…"}
            />
            <button
              onClick={() => sendReply.mutate()}
              disabled={sendReply.isPending || !reply.trim()}
              aria-label="Send reply"
              className="rounded-xl bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminSupportPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets", search, statusFilter],
    queryFn: async () => {
      const r = await supportService.listTickets({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
      });
      if (!r.success) return [];
      return r.data;
    },
  });

  const statusCounts = tickets.reduce((acc: Record<string, number>, t: SupportTicket) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black text-foreground">Support Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage student support tickets and provide assistance.</p>
      </div>

      {/* Status overview */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {["open","pending","resolved","closed"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            aria-pressed={statusFilter === s}
            className={`rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              statusFilter === s ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{s}</p>
            <p className={`mt-1.5 text-2xl font-black ${statusFilter === s ? "text-primary" : "text-foreground"}`}>
              {statusCounts[s] ?? 0}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="support-ticket-search" className="sr-only">Search tickets</label>
        <input
          id="support-ticket-search"
          className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search tickets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Ticket list */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-4 size-12 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold text-foreground">No tickets found</p>
            <p className="mt-1 text-sm text-muted-foreground">Support tickets from students will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((ticket: SupportTicket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full text-left px-5 py-4 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_VARIANTS[ticket.status] ?? "muted"} className="capitalize">{ticket.status}</Badge>
                      <Badge variant={PRIORITY_VARIANTS[ticket.priority] ?? "muted"} className="capitalize">{ticket.priority}</Badge>
                      <Badge variant="muted" className="capitalize">{ticket.category}</Badge>
                    </div>
                    <p className="mt-1.5 font-semibold text-foreground truncate">{ticket.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ticket.student?.full_name} • {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-none text-primary">
                    <AlertCircle className="size-5" aria-hidden="true" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTicket && <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
      </AnimatePresence>
    </div>
  );
}
