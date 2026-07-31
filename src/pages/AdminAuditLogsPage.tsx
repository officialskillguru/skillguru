import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { listAuditLogs, type AuditLogEntry } from "@/services/auditLogs.service";
import { exportToCSV } from "@/utils/export";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

const ACTION_VARIANTS: Record<string, NonNullable<BadgeProps["variant"]>> = {
  created: "success",
  updated: "info",
  deleted: "destructive",
  login: "secondary",
  logout: "muted",
  payment: "warning",
  assigned: "info",
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, search, entityType],
    queryFn: () => listAuditLogs({ page, pageSize: 30, search, entityType }),
  });

  const logs = data?.data ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.ceil(count / 30);

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        id: "actor",
        header: "Actor",
        cell: ({ row }) => {
          const actor = row.original.actor;
          return actor ? (
            <div>
              <p className="font-semibold text-foreground">{actor.full_name}</p>
              <p className="text-xs text-muted-foreground">{actor.email}</p>
            </div>
          ) : <span className="text-xs text-muted-foreground">System</span>;
        },
      },
      {
        id: "action",
        accessorFn: (row) => row.action ?? "",
        header: "Action",
        cell: ({ row }) => {
          const action = row.original.action ?? "";
          const actionKey = action.split("_")[0] ?? action;
          return <Badge variant={ACTION_VARIANTS[actionKey] ?? "muted"}>{action}</Badge>;
        },
      },
      {
        id: "entity_type",
        header: "Entity",
        cell: ({ row }) => <span className="text-sm text-muted-foreground capitalize">{row.original.entity_type}</span>,
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => {
          const details = row.original.details;
          return details ? (
            <p className="max-w-xs truncate text-xs text-muted-foreground">{JSON.stringify(details).slice(0, 80)}</p>
          ) : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: "created_at",
        header: "Time",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {row.original.created_at ? new Date(row.original.created_at).toLocaleString() : "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground">Audit Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete record of all system actions and user activities.
          </p>
        </div>
        <button
          onClick={() => exportToCSV(logs as unknown as Record<string, unknown>[], "audit_logs")}
          className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="size-4" aria-hidden="true" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="audit-log-search" className="sr-only">Search actions</label>
          <input
            id="audit-log-search"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search actions…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <label htmlFor="audit-log-entity-type" className="sr-only">Filter by entity type</label>
        <select
          id="audit-log-entity-type"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={entityType}
          onChange={e => { setEntityType(e.target.value); setPage(1); }}
        >
          <option value="all">All Entity Types</option>
          {["course","student","mentor","payment","enrollment","certificate","lead","ticket","settings"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={logs} hidePagination />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({count} total)</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronLeft className="size-3" aria-hidden="true" /> Prev
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Next <ChevronRight className="size-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
