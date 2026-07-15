import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Search, RefreshCw, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { paymentRepository } from "@/repositories/payment.repository";
import { exportToCSV } from "@/utils/export";
import { Input } from "@/components/ui/input";

type StubPayment = {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  created_at: string;
};

export default function AdminPaymentsPage() {
  usePageMeta("Payments Management | Admin");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: payments = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => [] /* stub */,
  });

  const filteredPayments = payments.filter((payment: StubPayment) =>
    payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = payments.reduce((acc: number, curr: StubPayment) => {
    return curr.status === "completed" ? acc + Number(curr.amount) : acc;
  }, 0);

  const handleExport = () => {
    exportToCSV(filteredPayments, "payments_export");
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black text-primary">Payments Overview</h1>
          <p className="mt-1 text-muted-foreground">Monitor and manage all transactions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void refetch()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Total Revenue</h3>
            <DollarSign className="h-4 w-4 text-secondary" />
          </div>
          <p className="mt-2 text-2xl font-black text-primary">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Completed Payments</h3>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-primary">{payments.filter((p: StubPayment) => p.status === 'completed').length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Failed Payments</h3>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-primary">{payments.filter((p: StubPayment) => p.status === 'failed').length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, Order ID, or Status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm border-none bg-transparent focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-4 font-bold text-primary">Payment ID</th>
                <th className="p-4 font-bold text-primary">Order ID</th>
                <th className="p-4 font-bold text-primary">Date</th>
                <th className="p-4 font-bold text-primary text-right">Amount</th>
                <th className="p-4 font-bold text-primary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading payments...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">No payments found.</td>
                </tr>
              ) : (
                filteredPayments.map((payment: StubPayment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-muted/50">
                    <td className="p-4 font-medium text-foreground">{payment.id.split('-')[0]}...</td>
                    <td className="p-4 text-muted-foreground">{payment.order_id.split('-')[0]}...</td>
                    <td className="p-4 text-muted-foreground">{format(new Date(payment.created_at), "MMM d, yyyy")}</td>
                    <td className="p-4 text-right font-bold text-foreground">₹{payment.amount}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        payment.status === 'refunded' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
