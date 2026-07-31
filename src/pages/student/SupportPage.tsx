import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus, X, ChevronRight, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supportService, type SupportTicket, type TicketMessage } from "@/services/mentor-invite.service";
import { Badge } from "@/components/ui/badge";

type BadgeVariant = "info" | "warning" | "success" | "muted" | "destructive";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  open: "info",
  pending: "warning",
  resolved: "success",
  closed: "muted",
};

const PRIORITY_VARIANTS: Record<string, BadgeVariant> = {
  low: "muted",
  medium: "info",
  high: "warning",
  urgent: "destructive",
};

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", category: "general", priority: "medium" });

  const submit = useMutation({
    mutationFn: async () => {
      const r = await supportService.createTicket(form);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("Ticket submitted! Our support team will respond soon.");
      void qc.invalidateQueries({ queryKey: ["my-tickets"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-black text-foreground">Raise a Support Ticket</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Subject *</label>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Describe your issue briefly…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Category</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {["general","payment","course","technical","certificate","other"].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Priority</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                {["low","medium","high","urgent"].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Description *</label>
            <textarea
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={5}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Please describe your issue in detail, including any steps to reproduce…"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Cancel</button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !form.title || !form.description}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50"
          >
            {submit.isPending ? "Submitting…" : "Submit Ticket"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TicketView({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

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
      const r = await supportService.addTicketMessage(ticket.id, reply, false);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      setReply("");
      void qc.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] });
    },
  });

  const visibleMessages = messages.filter((msg: TicketMessage) => !msg.is_internal);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-foreground/40">
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        className="flex h-[85vh] w-full max-w-xl flex-col rounded-l-2xl border-l border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANTS[ticket.status] ?? "muted"} className="capitalize">{ticket.status}</Badge>
              <Badge variant={PRIORITY_VARIANTS[ticket.priority] ?? "muted"} className="capitalize">{ticket.priority}</Badge>
            </div>
            <p className="mt-1.5 font-black text-foreground">{ticket.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close ticket" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-foreground">{ticket.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString()}</p>
          </div>
          {visibleMessages.map((msg: TicketMessage) => (
            <div key={msg.id} className="flex justify-start gap-3">
              <div className="flex size-8 flex-none items-center justify-center rounded-full bg-primary/20 text-xs font-black text-primary">
                {msg.author?.full_name?.[0] ?? "?"}
              </div>
              <div className="max-w-xs rounded-xl bg-muted/50 px-4 py-3 text-sm">
                <p className="mb-1 text-xs font-bold text-foreground">{msg.author?.full_name ?? "Support"}</p>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
        {ticket.status !== "closed" && ticket.status !== "resolved" && (
          <div className="flex gap-2 border-t border-border p-4">
            <label htmlFor="ticket-reply" className="sr-only">Reply</label>
            <textarea
              id="ticket-reply"
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Add a reply…"
            />
            <button
              onClick={() => sendReply.mutate()}
              disabled={sendReply.isPending || !reply.trim()}
              aria-label="Send reply"
              className="rounded-xl bg-primary px-4 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function SupportPage() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const r = await supportService.listTickets();
      if (!r.success) return [];
      return r.data;
    },
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Support Center</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Get help from our support team.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" /> New Ticket
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <LifeBuoy className="mb-4 size-12 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold text-foreground">No tickets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Having an issue? Raise a support ticket and we'll help you.</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Raise a Ticket
            </button>
          </div>
        ) : tickets.map((ticket: SupportTicket) => (
          <button
            key={ticket.id}
            onClick={() => setSelected(ticket)}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[ticket.status] ?? "muted"} className="capitalize">{ticket.status}</Badge>
                  <Badge variant={PRIORITY_VARIANTS[ticket.priority] ?? "muted"} className="capitalize">{ticket.priority}</Badge>
                  <span className="text-xs capitalize text-muted-foreground">{ticket.category}</span>
                </div>
                <p className="mt-1.5 font-semibold text-foreground">{ticket.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</p>
              </div>
              <ChevronRight className="ml-3 size-5 flex-none text-muted-foreground" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showNew && <NewTicketModal onClose={() => setShowNew(false)} />}
        {selected && <TicketView ticket={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
