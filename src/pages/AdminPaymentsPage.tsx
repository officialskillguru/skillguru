import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Search, RefreshCw, CheckCircle, XCircle, Clock, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { paymentService } from "@/services/payment.service";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DataTable } from "@/components/common/DataTable";

const STATUS_STYLES: Record<string, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  completed: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle },
  failed:    { cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",                 icon: XCircle },
  pending:   { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",         icon: Clock },
  created:   { cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",             icon: Clock },
};

function RefundModal({ payment, onClose }: {
  payment: Record<string, unknown>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(Number((payment.amount as number) ?? 0) / 100);
  const [reason, setReason] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  const refundMutation = useMutation({
    mutationFn: async () => {
      const order = payment.order as { id: string } | undefined;
      if (!order?.id) throw new Error("This payment has no linked order to refund.");
      const r = await paymentService.initiateRefund(order.id, amount * 100, reason);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("Refund initiated successfully");
      void qc.invalidateQueries({ queryKey: ["admin-payments"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-modal-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="refund-modal-title" className="text-lg font-black text-foreground">Initiate Refund</h2>
          <button onClick={onClose} aria-label="Close refund dialog" className="rounded-lg p-2 hover:bg-muted"><X className="size-4" aria-hidden="true" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Payment ID</p>
            <p className="text-sm font-mono text-foreground">{(payment.razorpay_payment_id as string) ?? payment.id as string}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Refund Amount (₹)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              max={Number((payment.amount as number) ?? 0) / 100}
              min={1}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Reason *</label>
            <textarea
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for refund..."
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button
            onClick={() => refundMutation.mutate()}
            disabled={refundMutation.isPending || !reason || amount <= 0}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
          >
            {refundMutation.isPending ? "Processing…" : "Initiate Refund"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  usePageMeta("Payments | Admin");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<Record<string, unknown> | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-payments", search, page],
    queryFn: async () => {
      const r = await paymentService.getAdminPayments(page, 20, search || undefined);
      if (!r.success) throw r.error;
      return r.data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["revenue-metrics"],
    queryFn: async () => {
      const r = await paymentService.getRevenueMetrics();
      if (!r.success) return null;
      return r.data;
    },
  });

  const payments = data?.data ?? [];
  const count = data?.count ?? 0;

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "payment_id",
      header: "Payment ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {(row.original.razorpay_payment_id as string)?.slice(0, 18) ?? (row.original.id as string)?.slice(0, 18)}…
        </span>
      ),
    },
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => {
        const order = row.original.order as Record<string, unknown> | null;
        const user = order?.user as Record<string, unknown> | null;
        return user ? (
          <div>
            <p className="font-semibold">{user.full_name as string}</p>
            <p className="text-xs text-muted-foreground">{user.email as string}</p>
          </div>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold">₹{(Number((row.original.amount as number) ?? 0) / 100).toLocaleString("en-IN")}</span>
      ),
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => <span className="capitalize text-muted-foreground">{(row.original.method as string) ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = (STATUS_STYLES[(row.original.status as string) ?? "pending"] ?? STATUS_STYLES.pending)!;
        const Icon = s.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>
            <Icon className="size-3" />
            {row.original.status as string}
          </span>
        );
      },
    },
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.created_at ? new Date(row.original.created_at as string).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        row.original.status === "completed" ? (
          <button
            onClick={() => setRefundTarget(row.original)}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <RotateCcw className="size-3" aria-hidden="true" /> Refund
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <GsapReveal direction="up" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary dark:text-cyan-200">Payments Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor transactions, process refunds, and track revenue.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </GsapReveal>

      {/* KPI Cards */}
      {metrics && (
        <GsapReveal direction="up" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Revenue",    value: `₹${(metrics.totalRevenue / 100).toLocaleString("en-IN")}`,  color: "text-emerald-600" },
            { label: "This Month",       value: `₹${(metrics.thisMonthRevenue / 100).toLocaleString("en-IN")}`, color: "text-primary" },
            { label: "Successful",       value: metrics.successfulPayments,                                   color: "text-emerald-500" },
            { label: "Total Refunds",    value: `₹${(metrics.totalRefunds / 100).toLocaleString("en-IN")}`,  color: "text-red-500" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
              <p className={`mt-2 text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </GsapReveal>
      )}

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search by payment ID or status…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        exportFilename="payments_export"
        hidePagination
        isLoading={isLoading}
        emptyState={{
          title: "No Payments Yet",
          description: "Payments will appear here once students start purchasing courses.",
        }}
      />
      {count > 20 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, count)} of {count}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted">Prev</button>
            <button disabled={page * 20 >= count} onClick={() => setPage(p => p + 1)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {refundTarget && <RefundModal payment={refundTarget} onClose={() => setRefundTarget(null)} />}
      </AnimatePresence>
    </div>
  );
}
