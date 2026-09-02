import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Loader2, Plus, X } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { usePageMeta } from "@/hooks/usePageMeta";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge-variants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface HiringPartner {
  id: string;
  name: string;
}

interface JobRow {
  id: string;
  title: string;
  employment_type: string;
  status: string;
  hiring_partner_id: string;
  hiring_partners: { name: string } | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }> = {
  draft: { label: "Draft", variant: "muted" },
  under_review: { label: "Under Review", variant: "warning" },
  open: { label: "Open", variant: "success" },
  closed: { label: "Closed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

const INPUT_CLS = "w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary";

async function fetchJobs(): Promise<JobRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("job_postings")
    .select("id, title, employment_type, status, hiring_partner_id, hiring_partners(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchPartners(): Promise<HiringPartner[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("hiring_partners").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}

export default function CounsellorJobsPage() {
  usePageMeta("Jobs & Internships");
  const queryClient = useQueryClient();
  const { data: jobs, isLoading } = useQuery({ queryKey: ["counsellor-jobs"], queryFn: fetchJobs });
  const { data: partners } = useQuery({ queryKey: ["counsellor-hiring-partners"], queryFn: fetchPartners });

  const [creatorOpen, setCreatorOpen] = useState(false);
  const [form, setForm] = useState({ hiring_partner_id: "", title: "", description: "", employment_type: "full_time" });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["counsellor-jobs"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClientOrThrow();
      const { error } = await supabase.from("job_postings").insert({
        hiring_partner_id: form.hiring_partner_id,
        title: form.title,
        description: form.description,
        employment_type: form.employment_type,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`"${form.title}" posted.`);
      setCreatorOpen(false);
      setForm({ hiring_partner_id: "", title: "", description: "", employment_type: "full_time" });
      invalidate();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to create posting."),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = getSupabaseClientOrThrow();
      const { error } = await supabase.from("job_postings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Posting updated."); invalidate(); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to update posting."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClientOrThrow();
      const { error } = await supabase.from("job_postings").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Posting removed."); invalidate(); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to remove posting."),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hiring_partner_id || !form.title || !form.description) {
      toast.error("Hiring partner, title, and description are required.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Jobs & Internships</h1>
          <p className="text-sm text-muted-foreground">Full CRUD across all postings, including mentor-authored ones.</p>
        </div>
        <Button onClick={() => setCreatorOpen(true)} className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          New Posting
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-8" aria-hidden="true" />}
          title="No postings yet"
          description="Create a job or internship posting for students to discover."
          primaryAction={<Button onClick={() => setCreatorOpen(true)} className="gap-2"><Plus className="size-4" aria-hidden="true" />New Posting</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => {
            const status = STATUS_BADGE[job.status] ?? { label: job.status, variant: "muted" as const };
            return (
              <li key={job.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{job.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job.hiring_partners?.name ?? "—"} · {job.employment_type.replace("_", " ")}
                  </p>
                </div>
                <Badge variant={status.variant} className="shrink-0 capitalize">{status.label}</Badge>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {job.status === "open" && (
                    <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ id: job.id, status: "closed" })} disabled={statusMutation.isPending}>Close</Button>
                  )}
                  {job.status === "closed" && (
                    <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ id: job.id, status: "open" })} disabled={statusMutation.isPending}>Reopen</Button>
                  )}
                  {(job.status === "draft" || job.status === "under_review") && (
                    <Button size="sm" onClick={() => statusMutation.mutate({ id: job.id, status: "open" })} disabled={statusMutation.isPending}>Publish</Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { if (window.confirm(`Remove "${job.title}"?`)) deleteMutation.mutate(job.id); }}
                    disabled={deleteMutation.isPending}
                    className="text-destructive-text hover:text-destructive-text"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === job.id ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : "Remove"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {creatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <button className="absolute inset-0 cursor-default" onClick={() => setCreatorOpen(false)} aria-label="Close" />
          <div role="dialog" aria-modal="true" aria-label="New job posting" className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="text-lg font-black text-foreground">New Job Posting</h2>
              <button onClick={() => setCreatorOpen(false)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div className="space-y-1">
                <label htmlFor="job-partner" className="text-xs font-black text-foreground">Hiring Partner</label>
                <select id="job-partner" value={form.hiring_partner_id} onChange={(e) => setForm({ ...form, hiring_partner_id: e.target.value })} className={INPUT_CLS}>
                  <option value="">Select a company…</option>
                  {(partners ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="job-title" className="text-xs font-black text-foreground">Title</label>
                <input id="job-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT_CLS} placeholder="Software Engineer" />
              </div>
              <div className="space-y-1">
                <label htmlFor="job-desc" className="text-xs font-black text-foreground">Description</label>
                <textarea id="job-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className={INPUT_CLS} />
              </div>
              <div className="space-y-1">
                <label htmlFor="job-type" className="text-xs font-black text-foreground">Employment Type</label>
                <select id="job-type" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} className={INPUT_CLS}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="internship">Internship</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreatorOpen(false)} className="h-11 rounded-xl px-5 text-xs font-black text-muted-foreground hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {createMutation.isPending ? "Posting…" : "Publish Posting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
