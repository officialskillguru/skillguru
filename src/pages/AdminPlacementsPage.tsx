import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Briefcase,
  Users,
  Plus,
  X,
  Trash2,
  RotateCcw,
  CalendarClock,
  MessageSquareText,
  FileCheck2,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { DataTable } from "@/components/common/DataTable";
import { QuickFilterChips } from "@/components/common/QuickFilterChips";
import { Badge } from "@/components/ui/badge";
import {
  useAdminHiringPartners,
  useCreateHiringPartner,
  useUpdateHiringPartner,
  useSoftDeleteHiringPartner,
  useRestoreHiringPartner,
  useAdminJobPostings,
  useCreateJobPosting,
  useUpdateJobPosting,
  useSoftDeleteJobPosting,
  useApproveJobPosting,
  useRejectJobPosting,
  useAllApplications,
  useAdvanceApplicationStage,
  useAdminStatusHistory,
  useAdminInterviewRounds,
  useScheduleInterviewRound,
  useRecordInterviewFeedback,
  useOfferForApplication,
  useReleaseOffer,
  useMarkPlacementJoined,
} from "@/hooks/admin/useAdminPlacements";
import type { HiringPartner } from "@/services/placement-partners.service";
import type { JobPostingWithPartner, JobPostingInput } from "@/services/placement-jobs.service";
import type { PlacementApplicationWithStudent, PlacementApplicationWithJob } from "@/services/placement-applications.service";

const INPUT_CLS = "w-full h-11 rounded-xl border border-border bg-muted px-3.5 text-sm outline-none focus:border-primary";

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview_round_1: "Interview R1",
  interview_round_2: "Interview R2",
  hr_round: "HR Round",
  selected: "Selected",
  offer_released: "Offer Released",
  joined: "Joined",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STAGE_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "muted"> = {
  applied: "info",
  shortlisted: "secondary",
  interview_round_1: "warning",
  interview_round_2: "warning",
  hr_round: "warning",
  selected: "success",
  offer_released: "success",
  joined: "success",
  rejected: "destructive",
  withdrawn: "muted",
};

function StageBadge({ status }: { status: string }) {
  return <Badge variant={STAGE_VARIANTS[status] ?? "muted"} className="capitalize">{STAGE_LABELS[status] ?? status}</Badge>;
}

export default function AdminPlacementsPage() {
  const [activeTab, setActiveTab] = useState<"partners" | "jobs" | "applications">("applications");

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Placement & Corporate Success</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Manage hiring partners, job postings, and the full applicant pipeline through to placement.
        </p>
      </div>

      <div className="flex border-b border-border">
        {([
          { id: "applications", label: "Applications", icon: Users },
          { id: "jobs", label: "Job Postings", icon: Briefcase },
          { id: "partners", label: "Hiring Partners", icon: Building2 },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "flex items-center gap-2 py-3.5 px-5 text-xs font-black border-b-2 transition-all",
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <tab.icon className="size-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "partners" && <PartnersTab />}
      {activeTab === "jobs" && <JobsTab />}
      {activeTab === "applications" && <ApplicationsTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Hiring Partners
// ─────────────────────────────────────────────────────────────────────────

function PartnersTab() {
  const { data: partners, isLoading } = useAdminHiringPartners();
  const createPartner = useCreateHiringPartner();
  const updatePartner = useUpdateHiringPartner();
  const softDelete = useSoftDeleteHiringPartner();
  const restore = useRestoreHiringPartner();

  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<Partial<HiringPartner> | null>(null);

  const handleCreate = () => {
    setSelected({ name: "", status: "active" });
    setEditorOpen(true);
  };

  const handleEdit = (partner: HiringPartner) => {
    setSelected(partner);
    setEditorOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.name) {
      toast.error("Company name is required.");
      return;
    }
    const input = {
      name: selected.name,
      logoUrl: selected.logo_url,
      websiteUrl: selected.website_url,
      industry: selected.industry,
      description: selected.description,
      contactName: selected.contact_name,
      contactEmail: selected.contact_email,
      contactPhone: selected.contact_phone,
      status: (selected.status as "active" | "inactive") ?? "active",
    };
    if (selected.id) {
      updatePartner.mutate(
        { id: selected.id, patch: input },
        {
          onSuccess: () => { toast.success(`"${selected.name}" updated.`); setEditorOpen(false); },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update partner."),
        }
      );
    } else {
      createPartner.mutate(input, {
        onSuccess: () => { toast.success(`"${selected.name}" added.`); setEditorOpen(false); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create partner."),
      });
    }
  };

  const columns = useMemo<ColumnDef<HiringPartner>[]>(
    () => [
      {
        id: "name",
        header: "Company",
        cell: ({ row }) => (
          <button onClick={() => handleEdit(row.original)} className="flex items-center gap-3 text-left">
            <img
              src={row.original.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.original.name)}`}
              alt=""
              className="size-9 shrink-0 rounded-xl bg-muted object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-bold text-foreground">{row.original.name}</p>
              <p className="truncate text-[11px] font-semibold text-muted-foreground">{row.original.industry || "—"}</p>
            </div>
          </button>
        ),
      },
      { id: "contact", header: "Contact", cell: ({ row }) => <span className="text-sm text-foreground/80">{row.original.contact_email || "—"}</span> },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant={row.original.status === "active" ? "success" : "muted"} className="capitalize">{row.original.status}</Badge>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!window.confirm(`Delete "${row.original.name}"? Existing job postings are kept.`)) return;
                softDelete.mutate(row.original.id, {
                  onSuccess: () => toast.success("Partner deleted."),
                  onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete."),
                });
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              title="Delete partner"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ),
      },
    ],
    [softDelete]
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <button onClick={handleCreate} className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90">
          <Plus className="size-4" /> Add Hiring Partner
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-muted" />)}</div>
      ) : (
        <DataTable columns={columns} data={partners ?? []} />
      )}

      <AnimatePresence>
        {editorOpen && selected && (
          <EditorDrawer title={selected.id ? "Edit Hiring Partner" : "Add Hiring Partner"} onClose={() => setEditorOpen(false)}>
            <form onSubmit={handleSave} className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <FormField label="Company Name">
                  <input value={selected.name ?? ""} onChange={(e) => setSelected({ ...selected, name: e.target.value })} className={INPUT_CLS} placeholder="Acme Corp" />
                </FormField>
                <FormField label="Logo URL">
                  <input value={selected.logo_url ?? ""} onChange={(e) => setSelected({ ...selected, logo_url: e.target.value })} className={INPUT_CLS} placeholder="https://..." />
                </FormField>
                <FormField label="Website">
                  <input value={selected.website_url ?? ""} onChange={(e) => setSelected({ ...selected, website_url: e.target.value })} className={INPUT_CLS} placeholder="https://..." />
                </FormField>
                <FormField label="Industry">
                  <input value={selected.industry ?? ""} onChange={(e) => setSelected({ ...selected, industry: e.target.value })} className={INPUT_CLS} placeholder="Technology" />
                </FormField>
                <FormField label="Description">
                  <textarea value={selected.description ?? ""} onChange={(e) => setSelected({ ...selected, description: e.target.value })} rows={3} className={INPUT_CLS} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Contact Name">
                    <input value={selected.contact_name ?? ""} onChange={(e) => setSelected({ ...selected, contact_name: e.target.value })} className={INPUT_CLS} />
                  </FormField>
                  <FormField label="Contact Email">
                    <input value={selected.contact_email ?? ""} onChange={(e) => setSelected({ ...selected, contact_email: e.target.value })} className={INPUT_CLS} />
                  </FormField>
                </div>
                {selected.id && (
                  <FormField label="Status">
                    <select value={selected.status ?? "active"} onChange={(e) => setSelected({ ...selected, status: e.target.value })} className={INPUT_CLS}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </FormField>
                )}
                {selected.id && selected.deleted_at && (
                  <button
                    type="button"
                    onClick={() => restore.mutate(selected.id!, { onSuccess: () => { toast.success("Partner restored."); setEditorOpen(false); } })}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-200"
                  >
                    <RotateCcw className="size-3.5" /> Restore Partner
                  </button>
                )}
              </div>
              <DrawerFooter onCancel={() => setEditorOpen(false)} submitLabel={selected.id ? "Save Changes" : "Add Partner"} />
            </form>
          </EditorDrawer>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Job Postings
// ─────────────────────────────────────────────────────────────────────────

function JobsTab() {
  const { data: jobs, isLoading } = useAdminJobPostings();
  const { data: partners } = useAdminHiringPartners();
  const createJob = useCreateJobPosting();
  const updateJob = useUpdateJobPosting();
  const softDelete = useSoftDeleteJobPosting();
  const approveJob = useApproveJobPosting();
  const rejectJob = useRejectJobPosting();

  const [editorOpen, setEditorOpen] = useState(false);
  type JobFormState = Partial<JobPostingWithPartner> & { skillsText?: string };
  const [selected, setSelected] = useState<JobFormState | null>(null);

  const handleCreate = () => {
    setSelected({ title: "", description: "", employment_type: "full_time", status: "draft", currency: "INR", openings_count: 1, skillsText: "" });
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
    const input = {
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
      status: (selected.status ?? "draft") as JobPostingInput["status"],
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
        onSuccess: () => { toast.success(`"${selected.title}" created.`); setEditorOpen(false); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create job posting."),
      });
    }
  };

  const columns = useMemo<ColumnDef<JobPostingWithPartner>[]>(
    () => [
      {
        id: "title",
        header: "Job",
        cell: ({ row }) => (
          <button onClick={() => handleEdit(row.original)} className="text-left">
            <p className="font-bold text-foreground">{row.original.title}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">{row.original.hiring_partners?.name ?? "—"}</p>
          </button>
        ),
      },
      { id: "type", header: "Type", cell: ({ row }) => <span className="text-xs font-bold capitalize text-foreground/80">{row.original.employment_type.replace("_", " ")}</span> },
      { id: "openings", header: "Openings", cell: ({ row }) => <span className="text-sm text-foreground/80">{row.original.openings_count}</span> },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "open"
                ? "success"
                : row.original.status === "under_review"
                  ? "warning"
                  : row.original.status === "draft"
                    ? "muted"
                    : "destructive"
            }
            className="capitalize"
          >
            {row.original.status.replace("_", " ")}
          </Badge>
        ),
      },
      {
        id: "owner",
        header: "Submitted by",
        cell: ({ row }) => (row.original.created_by ? <span className="text-xs text-muted-foreground">Mentor</span> : <span className="text-xs text-muted-foreground">Admin</span>),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {row.original.status === "under_review" && (
              <>
                <button
                  onClick={() =>
                    approveJob.mutate(row.original.id, {
                      onSuccess: () => toast.success(`"${row.original.title}" approved and published.`),
                      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to approve."),
                    })
                  }
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
                  title="Approve and publish"
                >
                  <CheckCircle2 className="size-4" />
                </button>
                <button
                  onClick={() => {
                    const reason = window.prompt(`Reason for sending "${row.original.title}" back to the mentor for changes:`);
                    if (!reason) return;
                    rejectJob.mutate(
                      { id: row.original.id, reason },
                      {
                        onSuccess: () => toast.success("Sent back to the mentor for changes."),
                        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send back."),
                      }
                    );
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  title="Send back for changes"
                >
                  <Ban className="size-4" />
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (!window.confirm(`Cancel and delete "${row.original.title}"? Existing applications are kept.`)) return;
                softDelete.mutate(row.original.id, { onSuccess: () => toast.success("Job posting removed.") });
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              title="Delete job posting"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ),
      },
    ],
    [softDelete, approveJob, rejectJob]
  );

  const [quickType, setQuickType] = useState<"all" | "jobs" | "internships">("all");
  const visibleJobs = useMemo(() => {
    const list = jobs ?? [];
    if (quickType === "all") return list;
    return list.filter((j) => (quickType === "internships") === (j.employment_type === "internship"));
  }, [jobs, quickType]);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <QuickFilterChips
          label="Filter by opportunity type"
          value={quickType}
          onChange={setQuickType}
          options={[
            { value: "all", label: "All" },
            { value: "jobs", label: "Jobs" },
            { value: "internships", label: "Internships" },
          ]}
        />
        <button onClick={handleCreate} className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90">
          <Plus className="size-4" /> New Job Posting
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {`${visibleJobs.length} posting${visibleJobs.length === 1 ? "" : "s"} shown`}
      </p>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-muted" />)}</div>
      ) : (
        <DataTable columns={columns} data={visibleJobs} />
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
                  <input type="date" value={selected.application_deadline?.slice(0, 10) ?? ""} onChange={(e) => setSelected({ ...selected, application_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })} className={INPUT_CLS} />
                </FormField>
                <FormField label="Status">
                  <select value={selected.status ?? "draft"} onChange={(e) => setSelected({ ...selected, status: e.target.value })} className={INPUT_CLS}>
                    <option value="draft">Draft</option>
                    <option value="under_review">Under Review</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </FormField>
              </div>
              <DrawerFooter onCancel={() => setEditorOpen(false)} submitLabel={selected.id ? "Save Changes" : "Create Job Posting"} />
            </form>
          </EditorDrawer>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Applications pipeline
// ─────────────────────────────────────────────────────────────────────────

function ApplicationsTab() {
  const { data: applications, isLoading } = useAllApplications();
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<(PlacementApplicationWithStudent & PlacementApplicationWithJob) | null>(null);

  const jobs = useMemo(() => {
    const map = new Map<string, string>();
    (applications ?? []).forEach((a) => { if (a.job_postings) map.set(a.job_postings.id, a.job_postings.title); });
    return Array.from(map.entries());
  }, [applications]);

  const filtered = useMemo(
    () => (applications ?? []).filter((a) => jobFilter === "all" || a.job_posting_id === jobFilter),
    [applications, jobFilter]
  );

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of filtered) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return counts;
  }, [filtered]);

  const columns = useMemo<ColumnDef<PlacementApplicationWithStudent & PlacementApplicationWithJob>[]>(
    () => [
      {
        id: "student",
        header: "Applicant",
        cell: ({ row }) => (
          <button onClick={() => setSelectedApp(row.original)} className="text-left">
            <p className="font-bold text-foreground">{row.original.profiles?.full_name || "—"}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">{row.original.profiles?.email}</p>
          </button>
        ),
      },
      { id: "job", header: "Job", cell: ({ row }) => <span className="text-sm text-foreground/80">{row.original.job_postings?.title ?? "—"}</span> },
      { id: "status", header: "Stage", cell: ({ row }) => <StageBadge status={row.original.status} /> },
      { id: "applied_at", header: "Applied", cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.applied_at).toLocaleDateString()}</span> },
    ],
    []
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {Object.entries(STAGE_LABELS).map(([key, label]) => (
          <div key={key} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-black text-foreground">{stageCounts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className={`${INPUT_CLS} max-w-sm`}>
        <option value="all">All job postings</option>
        {jobs.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
      </select>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-muted" />)}</div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      <AnimatePresence>
        {selectedApp && <ApplicationDrawer application={selectedApp} onClose={() => setSelectedApp(null)} />}
      </AnimatePresence>
    </div>
  );
}

function ApplicationDrawer({
  application,
  onClose,
}: {
  application: PlacementApplicationWithStudent & PlacementApplicationWithJob;
  onClose: () => void;
}) {
  const advanceStage = useAdvanceApplicationStage();
  const { data: history } = useAdminStatusHistory(application.id);
  const { data: rounds } = useAdminInterviewRounds(application.id);
  const scheduleInterview = useScheduleInterviewRound();
  const recordFeedback = useRecordInterviewFeedback(application.id);
  const { data: offer } = useOfferForApplication(application.id);
  const releaseOffer = useReleaseOffer();
  const markJoined = useMarkPlacementJoined();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [feedbackRoundId, setFeedbackRoundId] = useState<string | null>(null);

  const status = application.status;

  const handleReject = () => {
    const reason = window.prompt("Reason for rejection (shown in internal history only):") ?? "";
    advanceStage.mutate(
      { applicationId: application.id, newStatus: "rejected", note: reason },
      { onSuccess: () => toast.success("Application rejected."), onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reject.") }
    );
  };

  return (
    <EditorDrawer title={application.profiles?.full_name ?? "Applicant"} onClose={onClose} wide>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">{application.job_postings?.title}</p>
            <p className="text-xs font-semibold text-muted-foreground">{application.job_postings?.hiring_partners?.name}</p>
          </div>
          <StageBadge status={status} />
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "applied" && (
            <ActionButton
              icon={CheckCircle2}
              label="Shortlist"
              onClick={() =>
                advanceStage.mutate({ applicationId: application.id, newStatus: "shortlisted" }, { onSuccess: () => toast.success("Shortlisted.") })
              }
            />
          )}
          {["applied", "shortlisted"].includes(status) && <ActionButton icon={Ban} label="Reject" variant="destructive" onClick={handleReject} />}
          {["shortlisted", "interview_round_1", "interview_round_2", "hr_round"].includes(status) && (
            <ActionButton icon={CalendarClock} label="Schedule Interview" onClick={() => setScheduleOpen(true)} />
          )}
          {["interview_round_1", "interview_round_2", "hr_round"].includes(status) && (
            <ActionButton
              icon={CheckCircle2}
              label="Mark Selected"
              onClick={() => advanceStage.mutate({ applicationId: application.id, newStatus: "selected" }, { onSuccess: () => toast.success("Marked selected.") })}
            />
          )}
          {["interview_round_1", "interview_round_2", "hr_round", "selected"].includes(status) && (
            <ActionButton icon={Ban} label="Reject" variant="destructive" onClick={handleReject} />
          )}
          {status === "selected" && <ActionButton icon={FileCheck2} label="Release Offer" onClick={() => setOfferOpen(true)} />}
          {status === "offer_released" && (
            <ActionButton
              icon={CheckCircle2}
              label="Mark Joined"
              onClick={() => markJoined.mutate(application.id, { onSuccess: () => toast.success("Placement confirmed as joined.") })}
            />
          )}
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Interview Rounds</h4>
          {rounds && rounds.length > 0 ? (
            <div className="space-y-2">
              {rounds.map((round) => (
                <div key={round.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground capitalize">Round {round.round_number} - {round.round_type}</p>
                    <Badge variant={round.status === "completed" ? "success" : "info"} className="capitalize">{round.status}</Badge>
                  </div>
                  {round.meetings && <p className="mt-1 text-xs text-muted-foreground">{new Date(round.meetings.starts_at).toLocaleString()}</p>}
                  {round.status === "scheduled" && (
                    <button onClick={() => setFeedbackRoundId(round.id)} className="mt-2 flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                      <MessageSquareText className="size-3.5" /> Record Feedback
                    </button>
                  )}
                  {round.status === "completed" && <p className="mt-1 text-xs font-bold capitalize text-foreground/70">Decision: {round.decision}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No interview rounds scheduled yet.</p>
          )}
        </div>

        {offer && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Offer</h4>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
              <p className="font-bold text-foreground">{offer.designation || "Offer released"}</p>
              <p className="text-muted-foreground">{offer.package_amount} {offer.currency} · Joining {offer.joining_date ? new Date(offer.joining_date).toLocaleDateString() : "TBD"}</p>
              <Badge variant={offer.status === "accepted" ? "success" : "info"} className="mt-2 capitalize">{offer.status}</Badge>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Status History</h4>
          <div className="space-y-1.5">
            {(history ?? []).map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground/80">{h.from_status ? `${STAGE_LABELS[h.from_status] ?? h.from_status} → ` : ""}{STAGE_LABELS[h.to_status] ?? h.to_status}</span>
                <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {scheduleOpen && (
        <ScheduleInterviewModal
          existingRounds={rounds?.length ?? 0}
          submitting={scheduleInterview.isPending}
          onClose={() => setScheduleOpen(false)}
          onSubmit={(input) =>
            scheduleInterview.mutate(
              { applicationId: application.id, ...input },
              {
                onSuccess: () => { toast.success("Interview scheduled."); setScheduleOpen(false); },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to schedule interview."),
              }
            )
          }
        />
      )}

      {offerOpen && (
        <ReleaseOfferModal
          submitting={releaseOffer.isPending}
          onClose={() => setOfferOpen(false)}
          onSubmit={(input) =>
            releaseOffer.mutate(
              { applicationId: application.id, ...input },
              {
                onSuccess: () => { toast.success("Offer released."); setOfferOpen(false); },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to release offer."),
              }
            )
          }
        />
      )}

      {feedbackRoundId && (
        <FeedbackModal
          submitting={recordFeedback.isPending}
          onClose={() => setFeedbackRoundId(null)}
          onSubmit={(input) =>
            recordFeedback.mutate(
              { interviewRoundId: feedbackRoundId, ...input },
              {
                onSuccess: () => { toast.success("Feedback recorded."); setFeedbackRoundId(null); },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record feedback."),
              }
            )
          }
        />
      )}
    </EditorDrawer>
  );
}

function ScheduleInterviewModal({
  existingRounds,
  submitting,
  onClose,
  onSubmit,
}: {
  existingRounds: number;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { roundNumber: number; roundType: "technical" | "hr" | "managerial" | "other"; startsAt: string; endsAt: string; stageStatus: "interview_round_1" | "interview_round_2" | "hr_round"; meetUrl?: string }) => void;
}) {
  const [roundType, setRoundType] = useState<"technical" | "hr" | "managerial" | "other">("technical");
  const [stageStatus, setStageStatus] = useState<"interview_round_1" | "interview_round_2" | "hr_round">("interview_round_1");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(45);
  const [meetUrl, setMeetUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) { toast.error("Pick a date."); return; }
    const startsAt = new Date(`${date}T${time}`);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    onSubmit({
      roundNumber: existingRounds + 1,
      roundType,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      stageStatus,
      meetUrl: meetUrl || undefined,
    });
  };

  return (
    <Modal title="Schedule Interview Round" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Round Type">
          <select value={roundType} onChange={(e) => setRoundType(e.target.value as typeof roundType)} className={INPUT_CLS}>
            <option value="technical">Technical</option>
            <option value="hr">HR</option>
            <option value="managerial">Managerial</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        <FormField label="Maps to Pipeline Stage">
          <select value={stageStatus} onChange={(e) => setStageStatus(e.target.value as typeof stageStatus)} className={INPUT_CLS}>
            <option value="interview_round_1">Interview Round 1</option>
            <option value="interview_round_2">Interview Round 2</option>
            <option value="hr_round">HR Round</option>
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLS} required /></FormField>
          <FormField label="Time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT_CLS} required /></FormField>
        </div>
        <FormField label="Duration (minutes)"><input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={INPUT_CLS} /></FormField>
        <FormField label="Meeting URL (optional)"><input value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} className={INPUT_CLS} placeholder="https://meet.google.com/..." /></FormField>
        <DrawerFooter onCancel={onClose} submitLabel="Schedule" submitting={submitting} />
      </form>
    </Modal>
  );
}

function FeedbackModal({
  submitting,
  onClose,
  onSubmit,
}: {
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { decision: "pass" | "fail" | "pending"; recommendation: "advance" | "reject" | "hold"; rating?: number; strengths?: string; weaknesses?: string; notes?: string }) => void;
}) {
  const [decision, setDecision] = useState<"pass" | "fail" | "pending">("pass");
  const [recommendation, setRecommendation] = useState<"advance" | "reject" | "hold">("advance");
  const [rating, setRating] = useState(4);
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ decision, recommendation, rating, strengths, weaknesses, notes });
  };

  return (
    <Modal title="Record Interview Feedback" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Decision">
            <select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)} className={INPUT_CLS}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="pending">Pending</option>
            </select>
          </FormField>
          <FormField label="Recommendation">
            <select value={recommendation} onChange={(e) => setRecommendation(e.target.value as typeof recommendation)} className={INPUT_CLS}>
              <option value="advance">Advance</option>
              <option value="reject">Reject</option>
              <option value="hold">Hold</option>
            </select>
          </FormField>
        </div>
        <FormField label="Rating (1-5)"><input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className={INPUT_CLS} /></FormField>
        <FormField label="Strengths"><textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} className={INPUT_CLS} /></FormField>
        <FormField label="Weaknesses"><textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} rows={2} className={INPUT_CLS} /></FormField>
        <FormField label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={INPUT_CLS} /></FormField>
        <DrawerFooter onCancel={onClose} submitLabel="Save Feedback" submitting={submitting} />
      </form>
    </Modal>
  );
}

function ReleaseOfferModal({
  submitting,
  onClose,
  onSubmit,
}: {
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { packageAmount: number; currency: string; designation?: string; joiningDate?: string }) => void;
}) {
  const [packageAmount, setPackageAmount] = useState(0);
  const [currency, setCurrency] = useState("INR");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageAmount) { toast.error("Enter the package amount."); return; }
    onSubmit({ packageAmount, currency, designation: designation || undefined, joiningDate: joiningDate || undefined });
  };

  return (
    <Modal title="Release Offer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Designation"><input value={designation} onChange={(e) => setDesignation(e.target.value)} className={INPUT_CLS} placeholder="Software Engineer" /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Package Amount"><input type="number" value={packageAmount} onChange={(e) => setPackageAmount(Number(e.target.value))} className={INPUT_CLS} required /></FormField>
          <FormField label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={INPUT_CLS}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </FormField>
        </div>
        <FormField label="Joining Date"><input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} className={INPUT_CLS} /></FormField>
        <DrawerFooter onCancel={onClose} submitLabel="Release Offer" submitting={submitting} />
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared small building blocks
// ─────────────────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-black text-foreground">{label}</label>
      {children}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: typeof CheckCircle2;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-colors",
        variant === "destructive" ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-primary/10 text-primary hover:bg-primary/20",
      ].join(" ")}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}

function EditorDrawer({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40 backdrop-blur-xs">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className={`relative z-10 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function DrawerFooter({ onCancel, submitLabel, submitting }: { onCancel: () => void; submitLabel: string; submitting?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border px-0 py-4 sm:px-6 mt-4">
      <button type="button" onClick={onCancel} className="h-11 rounded-xl px-5 text-xs font-black text-muted-foreground hover:bg-muted">Cancel</button>
      <button type="submit" disabled={submitting} className="h-11 rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
