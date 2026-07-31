import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/DataTable";
import { getExtendedSupabaseClient } from "@/services/_shared";

interface RecentOrderRow {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  user: { full_name: string | null } | null;
  order_items: { courses: { title: string } | null }[];
}

async function fetchRecentOrders() {
  const supabase = getExtendedSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, total_amount, status, created_at, user:profiles(full_name), order_items(courses(title))")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as unknown as RecentOrderRow[];
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
  refunded: "bg-purple-100 text-purple-700",
};

export function RecentOrdersWidget() {
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["dashboard", "recent-orders"], queryFn: fetchRecentOrders });

  const columns = useMemo<ColumnDef<RecentOrderRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => <span className="text-slate-500 font-medium text-xs">#{row.original.id.slice(0, 8)}</span>,
      },
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => {
          const name = row.original.user?.full_name ?? "Unknown";
          return (
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-slate-900 text-sm">{name}</span>
            </div>
          );
        },
      },
      {
        id: "course",
        header: "Course",
        cell: ({ row }) => row.original.order_items?.[0]?.courses?.title ?? "—",
      },
      {
        accessorKey: "total_amount",
        header: "Amount",
        cell: ({ row }) => <span className="font-semibold text-slate-900">₹{Number(row.original.total_amount).toLocaleString("en-IN")}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_STYLES[row.original.status] ?? STATUS_STYLES.pending}`}>
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
      },
    ],
    []
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Orders</h2>
        <Link to="/admin/commerce/orders" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          View all orders
        </Link>
      </div>
      <div className="p-0 flex-1">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <div className="[&>div]:border-0 [&_th]:bg-white [&_th]:text-slate-500 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:font-bold [&_td]:py-4 [&_tr:last-child_td]:border-b-0">
            <DataTable columns={columns} data={orders} hidePagination={true} hideToolbar={true} />
          </div>
        )}
      </div>
    </div>
  );
}
