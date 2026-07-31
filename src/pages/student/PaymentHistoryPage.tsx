import { useOrders } from "@/hooks/student/usePayment";
import { PageLoader } from "@/components/common/PageLoader";
import { Receipt, Download } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { routes } from "@/lib/routes";
import { Badge } from "@/components/ui/badge";

type PaymentRow = {
  id: string;
  order_id: string;
  created_at: string;
  amount: number;
  status: string;
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive"> = {
  completed: "success",
  pending: "warning",
  created: "warning",
};

export default function PaymentHistoryPage() {
  const { data: orders, isLoading } = useOrders();
  const payments = (orders?.data ?? []) as unknown as PaymentRow[];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Payment History</h1>
        <p className="text-sm text-muted-foreground">View your orders, invoices, and transaction history.</p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-bold text-foreground">No Payments Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">You haven't made any purchases yet.</p>
          <Link
            to={routes.courses}
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-2 font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-4 font-bold text-foreground">Date</th>
                  <th className="p-4 font-bold text-foreground">Order ID</th>
                  <th className="p-4 font-bold text-foreground">Amount</th>
                  <th className="p-4 font-bold text-foreground">Status</th>
                  <th className="p-4 text-right font-bold text-foreground">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-muted/50">
                    <td className="p-4 text-muted-foreground">{format(new Date(payment.created_at), "MMM d, yyyy")}</td>
                    <td className="p-4 font-medium text-foreground">{payment.order_id.split("-")[0]}...</td>
                    <td className="p-4 font-bold text-foreground">₹{payment.amount}</td>
                    <td className="p-4">
                      <Badge variant={STATUS_VARIANTS[payment.status] ?? "destructive"} className="uppercase">
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {payment.status === "completed" ? (
                        <button
                          disabled
                          title="Invoice PDF download is not available yet"
                          className="inline-flex cursor-not-allowed items-center gap-1.5 text-muted-foreground opacity-60"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                          <span>Download</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
