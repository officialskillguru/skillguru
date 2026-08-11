import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Archive, Briefcase, Copy, Loader2, Plus, SendHorizonal, Undo2, Users, X } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useMentorProfileId } from "@/hooks/useMentorPortal";
import {
  useMentorJobPostings,
  useMentorHiringPartners,
  useCreateMentorJobPosting,
  useUpdateMentorJobPosting,
  useSubmitJobForReview,
  useWithdrawJobSubmission,
  useSetMentorJobOpenState,
  useArchiveMentorJobPosting,
  useDuplicateMentorJobPosting,
  useMentorApplicantsForJob,
} from "@/hooks/useMentorPlacements";
import type { JobPostingInput, JobPostingWithPartner } from "@/services/placement-jobs.service";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge-variants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { VariantProps } from "class-variance-authority";

const INPUT_CLS = "w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary";

const STATUS_BADGE: Record<string, { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }> = {
  draft: { label: "Draft", variant: "muted" },
  under_review: { label: "Under Review", variant: "warning" },
  open: { label: "Open", variant: "success" },
  closed: { label: "Closed", variant: "outline" },
  cancelled: { label: "Archived", variant: "outline" },
};

type JobFormState = Partial<JobPostingWithPartner> & { skillsText?: string };

export default function MentorJobsPage() {
  usePageMeta("Job Postings");
  const { data: mentorIdRaw } = useMentorProfileId();
  const mentorId = mentorIdRaw ?? undefined;
  const { data: jobs, isLoading } = useMentorJobPostings(mentorId);
  const { data: partners } = useMentorHiringPartners();

  const createJob = useCreateMentorJobPosting(mentorId);
  const updateJob = useUpdateMentorJobPosting(mentorId);
  const submit = useSubmitJobForReview(mentorId);
  const withdraw = useWithdrawJobSubmission(mentorId);
  const setOpenState = useSetMentorJobOpenState(mentorId);
  const archive = useArchiveMentorJobPosting(mentorId);
  const duplicate = useDuplicateMentorJobPosting(mentorId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<JobFormState | null>(null);
  const [applicantsJob, setApplicantsJob] = useState<JobPostingWithPartner | null>(null);

  const handleCreate = () => {
    setSelected({ title: "", description: "", employment_type: "full_time", currency: "INR", openings_count: 1, skillsText: "" });
    setEditorOpen(true);
  };

  const handleEdit = (job: JobPostingWithPartner) => {
    setSelected({ ...job, skillsText: (job.skills_required ?? []).join(", ") });
    setEditorOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.title || !selected.hiring_partner_id || !selected.description) {
      toast.error("Title, hiring partner, and description are required.");
      return;
    }
    const input: Omit<JobPostingInput, "status"> = {
      hiringPartnerId: selected.hiring_partner_id,
      title: selected.title,
      description: selected.description,
      employmentType: (selected.employment_type ?? "full_time") as JobPostingInput["employmentType"],
      location: selected.location,
      isRemote: selected.is_remote ?? false,
      minPackage: selected.min_package ?? null,
      maxPackage: selected.max_package ?? null,
      currency: selected.currency ?? "INR",
      skillsRequired: (selected.skillsText ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      openingsCount: selected.openings_count ?? 1,
      applicationDeadline: selected.application_deadline,
    };
    if (selected.id) {
      updateJob.mutate(
        { id: selected.id, patch: input },
        {
          onSuccess: () => { toast.success(`"${selected.title}" updated.`); setEditorOpen(false); },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update job posting."),
        }
      );
    } else {
      createJob.mutate(input, {
        onSuccess: () => { toast.success(`"${selected.title}" saved as a draft.`); setEditorOpen(false); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create job posting."),
      });
    }
  };

  const metrics = useMemo(() => {
    const list = jobs ?? [];
    return [
      { label: "Total Postings", value: list.length },
      { label: "Drafts", value: list.filter((j) => j.status === "draft").length },
      { label: "Under Review", value: list.filter((j) => j.status === "under_review").length },
      { label: "Open", value: list.filter((j) => j.status === "open").length },
    ];
  }, [jobs]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  const list = jobs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">Job Postings</h2>
          <p className="text-sm text-muted-foreground">Post openings for your network and track applicants. New postings need admin approval before going live.</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          New Job Posting
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-black text-foreground">{m.value}</p>
            <p className="text-xs font-semibold text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-8" aria-hidden="true" />}
          title="No job postings yet"
          description="Post an opening for your students and professional network to apply to."
          primaryAction={
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="size-4" aria-hidden="true" />
              New Job Posting
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onEdit={() => handleEdit(job)}
              onViewApplicants={() => setApplicantsJob(job)}
              submit={submit}
              withdraw={withdraw}
              setOpenState={setOpenState}
              archive={archive}
              duplicate={duplicate}
            />
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editorOpen && selected && (
          <EditorDrawer title={selected.id ? "Edit Job Posting" : "New Job Posting"} onClose={() => setEditorOpen(false)}>
            <form onSubmit={handleSave} className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <FormField label="Hiring Partner">
                  <select value={selected.hiring_partner_id ?? ""} onChange={(e) => setSelected({ ...selected, hiring_partner_id: e.target.value })} className={INPUT_CLS}>
                    <option value="">Select a company...</option>
                    {(partners ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Job Title">
                  <input value={selected.title ?? ""} onChange={(e) => setSelected({ ...selected, title: e.target.value })} className={INPUT_CLS} placeholder="Software Engineer" />
                </FormField>
                <FormField label="Description">
                  <textarea value={selected.description ?? ""} onChange={(e) => setSelected({ ...selected, description: e.target.value })} rows={4} className={INPUT_CLS} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Employment Type">
                    <select value={selected.employment_type ?? "full_time"} onChange={(e) => setSelected({ ...selected, employment_type: e.target.value })} className={INPUT_CLS}>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="internship">Internship</option>
                      <option value="contract">Contract</option>
                    </select>
                  </FormField>
                  <FormField label="Openings">
                    <input type="number" min={1} value={selected.openings_count ?? 1} onChange={(e) => setSelected({ ...selected, openings_count: Number(e.target.value) })} className={INPUT_CLS} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Location">
                    <input value={selected.location ?? ""} onChange={(e) => setSelected({ ...selected, location: e.target.value })} className={INPUT_CLS} placeholder="Bengaluru" />
                  </FormField>
                  <FormField label="Remote?">
                    <select value={selected.is_remote ? "yes" : "no"} onChange={(e) => setSelected({ ...selected, is_remote: e.target.value === "yes" })} className={INPUT_CLS}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Min Package (LPA)">
                    <input type="number" value={selected.min_package ?? ""} onChange={(e) => setSelected({ ...selected, min_package: e.target.value ? Number(e.target.value) : null })} className={INPUT_CLS} />
                  </FormField>
                  <FormField label="Max Package (LPA)">
                    <input type="number" value={selected.max_package ?? ""} onChange={(e) => setSelected({ ...selected, max_package: e.target.value ? Number(e.target.value) : null })} className={INPUT_CLS} />
                  </FormField>
                </div>
                <FormField label="Skills Required (comma separated)">
                  <input value={selected.skillsText ?? ""} onChange={(e) => setSelected({ ...selected, skillsText: e.target.value })} className={INPUT_CLS} placeholder="React, TypeScript, SQL" />
                </FormField>
                <FormField label="Application Deadline">
                  <input
                    type="date"
                    value={selected.application_deadline?.slice(0, 10) ?? ""}
                    onChange={(e) => setSelected({ ...selected, application_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className={INPUT_CLS}
                  />
                </FormField>
              </div>
              <DrawerFooter onCancel={() => setEditorOpen(false)} submitLabel={selected.id ? "Save Changes" : "Save as Draft"} pending={createJob.isPending || updateJob.isPending} />
            </form>
          </EditorDrawer>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {applicantsJob && <ApplicantsDrawer job={applicantsJob} onClose={() => setApplicantsJob(null)} />}
      </AnimatePresence>
    </div>
  );
}

function JobRow({
  job,
  onEdit,
  onViewApplicants,
  submit,
  withdraw,
  setOpenState,
  archive,
  duplicate,
}: Readonly<{
  job: JobPostingWithPartner;
  onEdit: () => void;
  onViewApplicants: () => void;
  submit: ReturnType<typeof useSubmitJobForReview>;
  withdraw: ReturnType<typeof useWithdrawJobSubmission>;
  setOpenState: ReturnType<typeof useSetMentorJobOpenState>;
  archive: ReturnType<typeof useArchiveMentorJobPosting>;
  duplicate: ReturnType<typeof useDuplicateMentorJobPosting>;
}>) {
  const status = STATUS_BADGE[job.status] ?? { label: job.status, variant: "muted" as const };

  const handleSubmit = () => {
    submit.mutate(job.id, {
      onSuccess: () => toast.success(`"${job.title}" submitted for admin review.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to submit for review."),
    });
  };

  const handleWithdraw = () => {
    withdraw.mutate(job.id, {
      onSuccess: () => toast.success(`"${job.title}" withdrawn back to draft.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to withdraw."),
    });
  };

  const handleToggleOpen = (isOpen: boolean) => {
    setOpenState.mutate(
      { id: job.id, isOpen },
      {
        onSuccess: () => toast.success(isOpen ? `"${job.title}" reopened.` : `"${job.title}" closed.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update posting."),
      }
    );
  };

  const handleArchive = () => {
    if (!window.confirm(`Archive "${job.title}"? It will be removed from public listings.`)) return;
    archive.mutate(job.id, {
      onSuccess: () => toast.success(`"${job.title}" archived.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to archive."),
    });
  };

  const handleDuplicate = () => {
    duplicate.mutate(job.id, {
      onSuccess: () => toast.success(`"${job.title}" duplicated as a new draft.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to duplicate."),
    });
  };

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{job.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {job.hiring_partners?.name ?? "—"} · {job.employment_type.replace("_", " ")}
          {job.location ? ` · ${job.location}` : ""}
        </p>
      </div>

      <Badge variant={status.variant} className="shrink-0 capitalize">{status.label}</Badge>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">Edit</Button>
        <Button variant="outline" size="sm" onClick={onViewApplicants} className="gap-1.5">
          <Users className="size-3.5" aria-hidden="true" />
          Applicants
        </Button>
        <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicate.isPending} className="gap-1.5">
          {duplicate.isPending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          Duplicate
        </Button>

        {job.status === "draft" && (
          <Button size="sm" onClick={handleSubmit} disabled={submit.isPending} className="gap-1.5">
            {submit.isPending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <SendHorizonal className="size-3.5" aria-hidden="true" />}
            Submit for Review
          </Button>
        )}
        {job.status === "under_review" && (
          <Button variant="outline" size="sm" onClick={handleWithdraw} disabled={withdraw.isPending} className="gap-1.5">
            {withdraw.isPending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Undo2 className="size-3.5" aria-hidden="true" />}
            Withdraw
          </Button>
        )}
        {job.status === "open" && (
          <Button variant="outline" size="sm" onClick={() => handleToggleOpen(false)} disabled={setOpenState.isPending} className="gap-1.5">
            Close
          </Button>
        )}
        {job.status === "closed" && (
          <Button variant="outline" size="sm" onClick={() => handleToggleOpen(true)} disabled={setOpenState.isPending} className="gap-1.5">
            Reopen
          </Button>
        )}
        {job.status !== "cancelled" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={archive.isPending}
            className="gap-1.5 text-destructive-text hover:text-destructive-text"
          >
            {archive.isPending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Archive className="size-3.5" aria-hidden="true" />}
            Archive
          </Button>
        )}
      </div>
    </li>
  );
}

function ApplicantsDrawer({ job, onClose }: Readonly<{ job: JobPostingWithPartner; onClose: () => void }>) {
  const { data: applicants, isLoading } = useMentorApplicantsForJob(job.id);

  return (
    <EditorDrawer title={`Applicants · ${job.title}`} onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
        ) : applicants && applicants.length > 0 ? (
          <ul className="space-y-3">
            {applicants.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-3">
                <p className="font-bold text-foreground">{a.profiles?.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{a.profiles?.email}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant="info" className="capitalize">{a.status.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-muted-foreground">Applied {new Date(a.applied_at).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No applicants yet.</p>
        )}
      </div>
    </EditorDrawer>
  );
}

function FormField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-black text-foreground">{label}</label>
      {children}
    </div>
  );
}

function EditorDrawer({ title, onClose, children }: Readonly<{ title: string; onClose: () => void; children: React.ReactNode }>) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40 backdrop-blur-xs">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h3 className="text-lg font-black text-foreground">{title}</h3>
          <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function DrawerFooter({ onCancel, submitLabel, pending }: Readonly<{ onCancel: () => void; submitLabel: string; pending?: boolean }>) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
      <button type="button" onClick={onCancel} className="h-11 rounded-xl px-5 text-xs font-black text-muted-foreground hover:bg-muted">Cancel</button>
      <button type="submit" disabled={pending} className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {pending ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
