import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { GsapReveal } from "@/components/motion/gsap-reveal";

interface Refund {
  id: string;
  payment_id: string;
  order_id: string;
  amount: number;
  reason: string;
  status: "pending" | "processing" | "processed" | "failed";
  razorpay_refund_id: string | null;
  initiated_by: string | null;
  created_at: string;
  updated_at: string;
  payment?: { razorpay_payment_id: string; amount: number; order: { user: { full_name: string; email: string } | null } | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  processed:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed:     "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

async function fetchRefunds(search: string, status: string) {
  const supabase = getExtendedSupabaseClient();
  let query = supabase
    .from("refunds")
    .select(`
      *,
      payment:payments(razorpay_payment_id, amount, order:orders(user:profiles!orders_user_id_fkey(full_name, email)))
    `)
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`reason.ilike.%${search}%,razorpay_refund_id.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Refund[]) ?? [], count: count ?? 0 };
}

export default function AdminRefundsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Refund | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-refunds", search, statusFilter],
    queryFn: () => fetchRefunds(search, statusFilter),
  });

  const processRefund = useMutation({
    mutationFn: async ({ id, refundId }: { id: string; refundId: string }) => {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase
        .from("refunds")
        .update({
          status: "processed",
          razorpay_refund_id: refundId || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Refund marked as processed");
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ["admin-refunds"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [rzpRefundId, setRzpRefundId] = useState("");

  const refunds = data?.data ?? [];

  return (
    <div className="space-y-6 pb-12">
      <GsapReveal direction="up" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary dark:text-cyan-200">Refund Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track and process payment refunds.</p>
        </div>
      </GsapReveal>

      {/* Status cards */}
      <GsapReveal direction="up" className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {["all","pending","processing","processed"].map(s => {
          const count = s === "all" ? refunds.length : refunds.filter((r: Refund) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-2xl border p-4 text-left transition-all capitalize ${
                statusFilter === s ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s}</p>
              <p className={`mt-1.5 text-2xl font-black ${statusFilter === s ? "text-primary" : "text-foreground"}`}>{count}</p>
            </button>
          );
        })}
      </GsapReveal>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search by reason or Razorpay ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr className="text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Razorpay Refund ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td></tr>
              ))}
              {!isLoading && refunds.map((refund: Refund) => {
                const user = refund.payment?.order?.user;
                return (
                  <tr key={refund.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {user ? (
                        <div>
                          <p className="font-semibold">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      ₹{(refund.amount / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
                      <p className="truncate">{refund.reason}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[refund.status] ?? ""}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {refund.razorpay_refund_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(refund.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {refund.status === "pending" && (
                        <button
                          onClick={() => setSelected(refund)}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                        >
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!isLoading && refunds.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No refunds found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Refund Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-foreground">Mark Refund as Processed</h2>
                <button onClick={() => setSelected(null)}><X className="size-4" /></button>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-sm font-semibold">Amount: ₹{(selected.amount / 100).toLocaleString("en-IN")}</p>
                  <p className="text-sm text-muted-foreground">Reason: {selected.reason}</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Razorpay Refund ID (if available)</label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    value={rzpRefundId}
                    onChange={e => setRzpRefundId(e.target.value)}
                    placeholder="rfnd_xxxxx"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setSelected(null)} className="rounded-xl border px-5 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
                <button
                  onClick={() => processRefund.mutate({ id: selected.id, refundId: rzpRefundId })}
                  disabled={processRefund.isPending}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {processRefund.isPending ? "Processing…" : "Mark Processed"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
