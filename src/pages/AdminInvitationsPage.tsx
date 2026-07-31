import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { UserPlus, Mail, Clock, CheckCircle, XCircle, RotateCcw, Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { mentorInviteService, type MentorInvite } from "@/services/mentor-invite.service";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<string, NonNullable<BadgeProps["variant"]>> = {
  pending: "warning",
  accepted: "success",
  expired: "muted",
  cancelled: "destructive",
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending:   Clock,
  accepted:  CheckCircle,
  expired:   XCircle,
  cancelled: XCircle,
};

function InviteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", full_name: "", message: "" });

  const invite = useMutation({
    mutationFn: async () => {
      const r = await mentorInviteService.inviteMentor(form.email, form.full_name, form.message || undefined);
      if (!r.success) throw r.error;
      return r.data;
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${form.email}`);
      void qc.invalidateQueries({ queryKey: ["mentor-invites"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <UserPlus className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Invite Mentor</h2>
              <p className="text-xs text-muted-foreground">They'll receive an email to set up their account.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="invite-full-name" className="mb-1.5 block text-xs font-bold text-muted-foreground">Full Name *</label>
            <input
              id="invite-full-name"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Dr. Amit Sharma"
            />
          </div>
          <div>
            <label htmlFor="invite-email" className="mb-1.5 block text-xs font-bold text-muted-foreground">Email Address *</label>
            <input
              id="invite-email"
              type="email"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="mentor@example.com"
            />
          </div>
          <div>
            <label htmlFor="invite-message" className="mb-1.5 block text-xs font-bold text-muted-foreground">Personal Message (optional)</label>
            <textarea
              id="invite-message"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="We'd love to have you as a mentor on SkillGuru…"
            />
          </div>
          <div role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-foreground/80">
              <strong>Note:</strong> An invitation email will be sent to the mentor. They'll be able to set their password and complete profile setup. Requires the <code>create-mentor-account</code> Edge Function to be deployed.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
          <button
            onClick={() => invite.mutate()}
            disabled={invite.isPending || !form.email || !form.full_name}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Mail className="size-4" aria-hidden="true" />
            {invite.isPending ? "Sending…" : "Send Invitation"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminInvitationsPage() {
  const [showInvite, setShowInvite] = useState(false);
  const qc = useQueryClient();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["mentor-invites"],
    queryFn: async () => {
      const r = await mentorInviteService.listInvites();
      if (!r.success) return [];
      return r.data;
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const r = await mentorInviteService.cancelInvite(id);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("Invitation cancelled");
      void qc.invalidateQueries({ queryKey: ["mentor-invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resend = useMutation({
    mutationFn: async (id: string) => {
      const r = await mentorInviteService.resendInvite(id);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("Invitation resent");
      void qc.invalidateQueries({ queryKey: ["mentor-invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = {
    total:     invites.length,
    pending:   invites.filter((i: MentorInvite) => i.status === "pending").length,
    accepted:  invites.filter((i: MentorInvite) => i.status === "accepted").length,
    expired:   invites.filter((i: MentorInvite) => i.status === "expired").length,
  };

  const columns = useMemo<ColumnDef<MentorInvite>[]>(
    () => [
      {
        id: "mentor",
        accessorFn: (row) => row.full_name,
        header: "Mentor",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-foreground">{row.original.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const invite = row.original;
          const StatusIcon = STATUS_ICON[invite.status] ?? Clock;
          return (
            <Badge variant={STATUS_VARIANTS[invite.status] ?? "muted"} className="gap-1.5 capitalize">
              <StatusIcon className="size-3" aria-hidden="true" />
              {invite.status}
            </Badge>
          );
        },
      },
      {
        id: "invited_at",
        header: "Invited",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.invited_at).toLocaleDateString()}</span>,
      },
      {
        id: "expires_at",
        header: "Expires",
        cell: ({ row }) => {
          const invite = row.original;
          const isExpired = new Date(invite.expires_at) < new Date() && invite.status === "pending";
          return (
            <span className="text-xs text-muted-foreground">
              {new Date(invite.expires_at).toLocaleDateString()}
              {isExpired && <span className="ml-1 font-semibold text-destructive-text">(Expired)</span>}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const invite = row.original;
          if (invite.status !== "pending") return null;
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => resend.mutate(invite.id)}
                disabled={resend.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                title="Resend invitation"
              >
                <RotateCcw className="size-3" aria-hidden="true" /> Resend
              </button>
              <button
                onClick={() => cancel.mutate(invite.id)}
                disabled={cancel.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive-text hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                title="Cancel invitation"
              >
                <Trash2 className="size-3" aria-hidden="true" /> Cancel
              </button>
            </div>
          );
        },
      },
    ],
    [resend, cancel]
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground">Mentor Invitations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite new mentors to the platform and track invitation status.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden="true" /> Invite Mentor
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Invites", value: counts.total,    color: "text-foreground" },
          { label: "Pending",       value: counts.pending,  color: "text-warning" },
          { label: "Accepted",      value: counts.accepted, color: "text-success" },
          { label: "Expired",       value: counts.expired,  color: "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`mt-1.5 text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : (
        <DataTable columns={columns} data={invites} exportFilename="mentor_invitations_export" />
      )}

      <AnimatePresence>
        {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      </AnimatePresence>
    </div>
  );
}
