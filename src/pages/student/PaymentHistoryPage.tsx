import { useOrders } from "@/hooks/student/usePayment";
import { PageLoader } from "@/components/common/PageLoader";
import { Receipt, Download } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { routes } from "@/lib/routes";

export default function PaymentHistoryPage() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary">Payment History</h1>
        <p className="text-sm text-muted-foreground">View your orders, invoices, and transaction history.</p>
      </div>

      {!orders || (orders as any).length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-bold text-primary">No Payments Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">You haven't made any purchases yet.</p>
          <Link
            to={routes.courses}
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-2 font-bold text-primary-foreground transition-colors hover:bg-opacity-90"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-4 font-bold text-primary">Date</th>
                  <th className="p-4 font-bold text-primary">Order ID</th>
                  <th className="p-4 font-bold text-primary">Amount</th>
                  <th className="p-4 font-bold text-primary">Status</th>
                  <th className="p-4 font-bold text-primary text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(orders as { id: string, created_at: string, total_amount: number, status: string }[]).map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-muted/50">
                    <td className="p-4 text-muted-foreground">
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      {order.id.split('-')[0]}...
                    </td>
                    <td className="p-4 font-bold text-foreground">
                      ₹{order.total_amount}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'pending' || order.status === 'created' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {order.status === 'completed' ? (
                        <button 
                          className="inline-flex items-center gap-1.5 text-secondary hover:underline"
                          onClick={() => {
                            // Ideally fetch invoice ID for this order, or just show order receipt.
                            alert('Downloading invoice for order: ' + order.id);
                          }}
                        >
                          <Download className="h-4 w-4" />
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
