import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Receipt } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { paymentService, type StudentOrder } from "@/services/payment.service";
import { formatInr, paymentMethodLabel } from "@/features/checkout/checkout-schema";
import { routes } from "@/lib/routes";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
  completed: { label: "Paid", variant: "success" },
  pending: { label: "Awaiting payment", variant: "warning" },
  failed: { label: "Declined", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "muted" },
  refunded: { label: "Refunded", variant: "muted" },
};

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

function OrderAction({ order }: Readonly<{ order: StudentOrder }>) {
  const course = order.courses[0];
  if (!course) return <span className="text-muted-foreground">—</span>;
  if (order.status === "completed") {
    return (
      <Link to={`${routes.dashboard}/courses/${course.id}`} className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Open course<span className="sr-only">: {course.title}</span>
      </Link>
    );
  }
  if (order.status === "pending") {
    return (
      <Link to={`/checkout/${course.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Resume checkout<span className="sr-only">: {course.title}</span>
      </Link>
    );
  }
  return (
    <Link to={`/checkout/${course.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      Try again<span className="sr-only">: {course.title}</span>
    </Link>
  );
}

export default function PaymentHistoryPage() {
  usePageMeta("Payments & Receipts");
  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const res = await paymentService.getMyOrders();
      if (!res.success) throw res.error;
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Payments &amp; Receipts</h1>
        <p className="text-sm text-muted-foreground">Every checkout attempt, its outcome, and the receipt number for paid orders.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm font-semibold text-destructive-text">
          Your payments could not be loaded.
          <button type="button" onClick={() => void refetch()} className="ml-2 font-black underline">Retry</button>
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold text-foreground">No payments yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Courses you buy will appear here with their receipts.</p>
          <Link to={routes.courses} className="mt-6 inline-block rounded-lg bg-primary px-6 py-2 font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Explore courses
          </Link>
        </div>
      ) : (
        <>
        {/* Phones: one stacked card per order (a wide table would overflow the viewport). */}
        <ul className="space-y-3 md:hidden" aria-label="Your orders, newest first">
          {orders.map((order) => {
            const status = STATUS[order.status] ?? { label: order.status, variant: "muted" as const };
            return (
              <li key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold text-foreground">{order.courses.map((c) => c.title).join(", ") || "—"}</p>
                  <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                </div>
                {order.status === "failed" && order.failureReason && <p className="mt-1 text-xs text-muted-foreground">{order.failureReason}</p>}
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div><dt className="text-muted-foreground">Amount</dt><dd className="font-bold text-foreground">{formatInr(order.totalAmount)}</dd></div>
                  <div><dt className="text-muted-foreground">Date</dt><dd className="text-foreground">{format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}</dd></div>
                  <div><dt className="text-muted-foreground">Order ref</dt><dd className="font-mono text-foreground">{shortRef(order.id)}</dd></div>
                  <div><dt className="text-muted-foreground">Receipt</dt><dd className="break-all font-mono text-foreground">{order.invoiceNumber ?? "—"}</dd></div>
                </dl>
                <div className="mt-3 text-sm"><OrderAction order={order} /></div>
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Your orders and receipts, newest first</caption>
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="p-4 font-bold text-foreground">Date</th>
                  <th scope="col" className="p-4 font-bold text-foreground">Course</th>
                  <th scope="col" className="p-4 font-bold text-foreground">Order ref</th>
                  <th scope="col" className="p-4 font-bold text-foreground">Amount</th>
                  <th scope="col" className="p-4 font-bold text-foreground">Status</th>
                  <th scope="col" className="p-4 font-bold text-foreground">Receipt</th>
                  <th scope="col" className="p-4 font-bold text-foreground"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const status = STATUS[order.status] ?? { label: order.status, variant: "muted" as const };
                  return (
                    <tr key={order.id}>
                      <td className="p-4 text-muted-foreground">{format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}</td>
                      <td className="p-4 font-semibold text-foreground">{order.courses.map((c) => c.title).join(", ") || "—"}</td>
                      <td className="p-4 font-mono text-xs text-foreground">{shortRef(order.id)}</td>
                      <td className="p-4 font-bold text-foreground">{formatInr(order.totalAmount)}</td>
                      <td className="p-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {order.status === "failed" && order.failureReason && <p className="mt-1 text-xs text-muted-foreground">{order.failureReason}</p>}
                      </td>
                      <td className="p-4 font-mono text-xs text-foreground">
                        {order.invoiceNumber ?? <span className="font-sans text-muted-foreground">—</span>}
                        {order.invoiceNumber && order.paymentMethod && <p className="font-sans text-xs text-muted-foreground">via {paymentMethodLabel(order.paymentMethod)}</p>}
                      </td>
                      <td className="p-4"><OrderAction order={order} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
