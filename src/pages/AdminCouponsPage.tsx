import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, CheckCircle, XCircle, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { GsapReveal } from "@/components/motion/gsap-reveal";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "flat";
  discount_pct: number;
  max_uses: number | null;
  times_used: number | null;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  min_order_amount: number | null;
  created_at: string;
}

async function fetchCoupons(search: string) {
  const supabase = getExtendedSupabaseClient();
  let query = supabase.from("coupon_codes").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (search) query = query.ilike("code", `%${search}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as unknown as Coupon[]) ?? [], count: count ?? 0 };
}

function CouponModal({ coupon, onClose }: { coupon?: Partial<Coupon>; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Coupon>>(coupon ?? {
    code: "", discount_type: "percentage", discount_pct: 10, is_active: true,
  });

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getExtendedSupabaseClient();
      const payload = {
        code: form.code?.toUpperCase(),
        discount_type: form.discount_type,
        discount_pct: form.discount_pct,
        max_uses: form.max_uses ?? null,
        valid_until: form.valid_until ?? null,
        is_active: form.is_active ?? true,
        description: form.description ?? null,
        min_order_amount: form.min_order_amount ?? null,
      };

      const { error } = coupon?.id
        ? await supabase.from("coupon_codes").update(payload).eq("id", coupon.id)
        : await supabase.from("coupon_codes").insert(payload as { code: string; discount_pct: number });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(coupon?.id ? "Coupon updated" : "Coupon created");
      void qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm(f => ({ ...f, code }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-black text-foreground">{coupon?.id ? "Edit Coupon" : "Create Coupon"}</h2>
          <button onClick={onClose}><X className="size-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Coupon Code *</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.code ?? ""}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SKILLGURU20"
              />
              <button
                onClick={generateCode}
                className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold hover:bg-muted"
              >
                Generate
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Description</label>
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.description ?? ""}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="20% off for new students"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Discount Type</label>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none"
                value={form.discount_type ?? "percentage"}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as Coupon["discount_type"] }))}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                Value ({form.discount_type === "percentage" ? "%" : "₹"})
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.discount_pct ?? ""}
                onChange={e => setForm(f => ({ ...f, discount_pct: Number(e.target.value) }))}
                min={1}
                max={form.discount_type === "percentage" ? 100 : undefined}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Max Uses (blank = unlimited)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.max_uses ?? ""}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value ? Number(e.target.value) : null }))}
                placeholder="100"
                min={1}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Min Order Amount (₹)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.min_order_amount ?? ""}
                onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value ? Number(e.target.value) : null }))}
                placeholder="999"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">Valid Until (blank = no expiry)</label>
            <input
              type="date"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.valid_until?.split("T")[0] ?? ""}
              onChange={e => setForm(f => ({ ...f, valid_until: e.target.value || null }))}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-semibold text-foreground">Active</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.code}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
          >
            {save.isPending ? "Saving…" : coupon?.id ? "Update" : "Create Coupon"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminCouponsPage() {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Partial<Coupon> | null | "new">(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons", search],
    queryFn: () => fetchCoupons(search),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase.from("coupon_codes").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const coupons = data?.data ?? [];

  return (
    <div className="space-y-6 pb-12">
      <GsapReveal direction="up" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary dark:text-cyan-200">Coupons & Discounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage promotional discount codes.</p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> New Coupon
        </button>
      </GsapReveal>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search coupons…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr className="text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td></tr>
              ))}
              {!isLoading && coupons.map((coupon: Coupon) => (
                <tr key={coupon.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-black text-primary">{coupon.code}</span>
                      <button
                        onClick={() => { void navigator.clipboard.writeText(coupon.code); toast.success("Copied!"); }}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Copy className="size-3 text-muted-foreground" />
                      </button>
                    </div>
                    {coupon.description && <p className="mt-0.5 text-xs text-muted-foreground">{coupon.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">
                      {coupon.discount_type === "percentage" ? `${coupon.discount_pct}%` : `₹${coupon.discount_pct}`}
                    </span>
                    {coupon.min_order_amount && (
                      <p className="text-xs text-muted-foreground">Min: ₹{coupon.min_order_amount}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground">{coupon.times_used ?? 0}</span>
                    {coupon.max_uses && <span className="text-muted-foreground"> / {coupon.max_uses}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {coupon.valid_until ? `Until ${new Date(coupon.valid_until).toLocaleDateString()}` : "No expiry"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive.mutate({ id: coupon.id, is_active: coupon.is_active })}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        coupon.is_active
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {coupon.is_active ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
                      {coupon.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModal(coupon)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && coupons.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No coupons yet. <button className="text-primary underline" onClick={() => setModal("new")}>Create your first coupon</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modal !== null && (
          <CouponModal
            coupon={modal === "new" ? undefined : modal}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
