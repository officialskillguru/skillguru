import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { BookOpen, Layers, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  useKnowledgeDocuments,
  useKnowledgeBaseStats,
  useSetKnowledgeDocumentActive,
  useSyncKnowledgeBase,
} from "@/hooks/admin/useKnowledgeBase";
import type { KnowledgeDocument } from "@/services/knowledge-base.service";

const CATEGORY_LABELS: Record<string, string> = {
  course: "Course",
  mentor: "Teacher",
  testimonial: "Testimonial",
  pricing: "Pricing",
  faq: "FAQ",
  policy: "Policy",
  general: "General",
};

export default function AdminKnowledgeBasePage() {
  const [search, setSearch] = useState("");
  const { data: stats, isLoading: loadingStats } = useKnowledgeBaseStats();
  const { data: docsData, isLoading: loadingDocs } = useKnowledgeDocuments({ search: search || undefined, pageSize: 50 });
  const setActive = useSetKnowledgeDocumentActive();
  const sync = useSyncKnowledgeBase();

  const documents = docsData?.data ?? [];

  const handleSync = () => {
    sync.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message || "Sync completed with errors — see the errors below.");
        }
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to sync knowledge base."),
    });
  };

  const columns: ColumnDef<KnowledgeDocument>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.title}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="info">{CATEGORY_LABELS[row.original.category] ?? row.original.category}</Badge>,
    },
    {
      id: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.source_table ? `${row.original.source_table} (synced)` : "Manually authored"}
        </span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.updated_at).toLocaleString()}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => {
            if (setActive.isPending) return;
            setActive.mutate({ id: row.original.id, isActive: !row.original.is_active });
          }}
          aria-disabled={setActive.isPending}
          aria-busy={setActive.isPending}
          aria-pressed={row.original.is_active}
          className="inline-flex items-center gap-1.5 rounded-full aria-disabled:opacity-50 aria-disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={row.original.is_active ? `Deactivate ${row.original.title}` : `Activate ${row.original.title}`}
        >
          {row.original.is_active ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="size-3" aria-hidden="true" /> Active
            </Badge>
          ) : (
            <Badge variant="muted" className="gap-1">
              <XCircle className="size-3" aria-hidden="true" /> Inactive
            </Badge>
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The RAG corpus the AI voice/chat agent draws on. Synced from real course/mentor/testimonial data — clicking Sync re-ingests and re-embeds everything below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (sync.isPending) return;
            handleSync();
          }}
          aria-disabled={sync.isPending}
          aria-busy={sync.isPending}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90 aria-disabled:opacity-50 aria-disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className={`size-4 ${sync.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          {sync.isPending ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite" aria-atomic="false">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <BookOpen className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-2xl font-black text-foreground">{stats?.documentCount ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">Documents</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <Layers className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-2xl font-black text-foreground">{stats?.chunkCount ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">Embedded Chunks</p>
            </div>
            {Object.entries(stats?.byCategory ?? {})
              .slice(0, 2)
              .map(([category, count]) => (
                <div key={category} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-2xl font-black text-foreground">{count}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{CATEGORY_LABELS[category] ?? category}</p>
                </div>
              ))}
          </>
        )}
      </div>

      {sync.data?.data && sync.data.data.errors.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
          <p className="text-sm font-black text-destructive">{sync.data.data.errors.length} document(s) failed to sync</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {sync.data.data.errors.map((e, i) => (
              <li key={i}>
                {e.sourceTable}/{e.sourceId}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative w-full max-w-sm">
        <label htmlFor="kb-search" className="sr-only">Search documents by title</label>
        <input
          id="kb-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents by title..."
          className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {loadingDocs ? (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          No documents yet. Click "Sync Now" to ingest real course, mentor, and testimonial content.
        </p>
      ) : (
        <DataTable columns={columns} data={documents} hidePagination />
      )}
    </div>
  );
}
