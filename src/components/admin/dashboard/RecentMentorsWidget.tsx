import { useMemo } from "react";
import { Link } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/DataTable";
import { useMentors } from "@/hooks/useAdminData";
import type { Mentor } from "@/services/mentors.service";

export function RecentMentorsWidget() {
  const { data, isLoading } = useMentors({ page: 1, pageSize: 5, sortBy: "created_at", sortDirection: "desc" });
  const mentors = data?.data ?? [];

  const columns = useMemo<ColumnDef<Mentor>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Teacher",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
              {(row.original.name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900 leading-tight">{row.original.name}</p>
              <p className="text-[11px] text-slate-500">{row.original.headline ?? ""}</p>
            </div>
          </div>
        ),
      },
      { accessorKey: "email", header: "Email" },
      {
        accessorKey: "created_at",
        header: "Date Joined",
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
      },
    ],
    []
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Recently Registered Teachers</h2>
        <Link to="/admin/users/teachers" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          View all teachers
        </Link>
      </div>
      <div className="p-0 flex-1">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : mentors.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No teachers registered yet.</p>
        ) : (
          <div className="[&>div]:border-0 [&_th]:bg-white [&_th]:text-slate-500 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:font-bold [&_td]:py-4 [&_tr:last-child_td]:border-b-0">
            <DataTable columns={columns} data={mentors} hidePagination={true} hideToolbar={true} />
          </div>
        )}
      </div>
    </div>
  );
}
