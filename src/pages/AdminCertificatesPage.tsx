import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Award, Search, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getExtendedSupabaseClient } from "@/services/_shared";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { DataTable } from "@/components/common/DataTable";
import { verifyCertificateRoute } from "@/lib/routes";

interface Certificate {
  id: string;
  enrollment_id: string;
  certificate_number: string;
  issued_at: string;
  created_at: string;
  certificate_file_id: string | null;
  verification_code: string;
  // Joined fields:
  enrollment?: {
    student: { full_name: string; email: string } | null;
    course: { title: string } | null;
  } | null;
}

async function fetchCertificates(search: string, page: number) {
  const supabase = getExtendedSupabaseClient();
  const offset = (page - 1) * 20;

  let query = supabase
    .from("certificates")
    .select(`
      *,
      enrollment:enrollments(
        student:profiles!enr_student_fk(full_name, email),
        course:courses(title)
      )
    `, { count: "exact" })
    .order("issued_at", { ascending: false })
    .range(offset, offset + 19);

  if (search) query = query.ilike("certificate_number", `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Certificate[]) ?? [], count: count ?? 0 };
}

async function backfillMissingCertificates() {
  const supabase = getExtendedSupabaseClient();

  const { data: completed, error: completedError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("status", "completed");
  if (completedError) throw completedError;

  const { data: existing, error: existingError } = await supabase.from("certificates").select("enrollment_id");
  if (existingError) throw existingError;

  const existingIds = new Set((existing ?? []).map((c) => c.enrollment_id));
  const missing = (completed ?? []).filter((e) => !existingIds.has(e.id));
  if (missing.length === 0) return 0;

  const { data: template } = await supabase.from("certificate_templates").select("id").eq("is_default", true).maybeSingle();

  const rows = missing.map((enrollment) => ({
    enrollment_id: enrollment.id,
    certificate_number: `CERT-${new Date().toISOString().slice(2, 7).replace("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    verification_code: crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(),
    template_id: template?.id ?? null,
    issued_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase.from("certificates").insert(rows);
  if (insertError) throw insertError;
  return missing.length;
}

export default function AdminCertificatesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-certificates", search, page],
    queryFn: () => fetchCertificates(search, page),
  });

  const backfillMutation = useMutation({
    mutationFn: backfillMissingCertificates,
    onSuccess: (count) => {
      toast.success(count > 0 ? `Issued ${count} missing certificate(s).` : "No missing certificates found.");
      void queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
    },
    onError: () => toast.error("Failed to backfill certificates."),
  });

  const certs = data?.data ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.ceil(count / 20);

  const columns: ColumnDef<Certificate>[] = [
    {
      accessorKey: "certificate_number",
      header: "Certificate #",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Award className="size-4 text-amber-500" />
          <span className="font-mono text-xs font-semibold text-foreground">{row.original.certificate_number}</span>
        </div>
      ),
    },
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-foreground">{row.original.enrollment?.student?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{row.original.enrollment?.student?.email ?? ""}</p>
        </div>
      ),
    },
    {
      id: "course",
      header: "Course",
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.enrollment?.course?.title ?? "—"}</span>,
    },
    {
      accessorKey: "issued_at",
      header: "Issued",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.issued_at).toLocaleDateString()}</span>,
    },
    {
      id: "verification",
      header: "Verification",
      cell: ({ row }) => (
        <Link
          to={verifyCertificateRoute(row.original.verification_code)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
        >
          {row.original.verification_code} <ExternalLink className="size-3" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <GsapReveal direction="up" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary dark:text-cyan-200">Certificates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all issued completion certificates — {count} total issued.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"
            title="Issue certificates for any completed enrollment that doesn't have one yet"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${backfillMutation.isPending ? "animate-spin" : ""}`} /> Backfill Missing
          </button>
        </div>
      </GsapReveal>

      {/* Stats */}
      <GsapReveal direction="up" className="grid gap-3 grid-cols-2">
        {[
          { label: "Total Issued", value: count,                                                                    color: "text-foreground" },
          { label: "With File",    value: certs.filter((c: Certificate) => !!c.certificate_file_id).length, color: "text-emerald-600" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`mt-1.5 text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </GsapReveal>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search by certificate number…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={certs}
        exportFilename="certificates_export"
        hidePagination
        isLoading={isLoading}
        emptyState={{
          title: "No Certificates Found",
          description: "Certificates are issued automatically when students complete courses.",
        }}
      />
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
