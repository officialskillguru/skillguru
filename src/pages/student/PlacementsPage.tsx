import { useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Search,
  Heart,
  Loader2,
  MapPin,
  Wallet,
  CalendarClock,
  FileCheck2,
  Upload,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/services/storage.service";
import {
  useBrowseJobs,
  useSavedJobIds,
  useToggleSavedJob,
  useMyApplications,
  useMyApplicationForJob,
  useApplyToJob,
  useWithdrawApplication,
  useMyUpcomingInterviews,
  useMyOffers,
  useStatusHistory,
} from "@/hooks/student/usePlacements";
import type { JobBrowseFilters, JobPostingWithPartner } from "@/services/placement-jobs.service";

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview_round_1: "Interview Round 1",
  interview_round_2: "Interview Round 2",
  hr_round: "HR Round",
  selected: "Selected",
  offer_released: "Offer Released",
  joined: "Joined",
  rejected: "Not Selected",
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

function formatPackage(job: Pick<JobPostingWithPartner, "min_package" | "max_package" | "currency">) {
  if (!job.min_package && !job.max_package) return "Not disclosed";
  const fmt = (n: number) => `${job.currency} ${n} LPA`;
  if (job.min_package && job.max_package) return `${fmt(job.min_package)} - ${fmt(job.max_package)}`;
  return fmt((job.min_package ?? job.max_package)!);
}

export default function PlacementsPage() {
  const [tab, setTab] = useState<"browse" | "applications" | "interviews" | "offers">("browse");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-foreground">Placements</h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Browse openings, track your applications, and view offers.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {([
          { id: "browse", label: "Browse Jobs" },
          { id: "applications", label: "My Applications" },
          { id: "interviews", label: "Interviews" },
          { id: "offers", label: "Offers & History" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "py-3 px-4 text-xs font-black border-b-2 transition-colors",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "browse" && <BrowseJobsTab />}
      {tab === "applications" && <MyApplicationsTab />}
      {tab === "interviews" && <InterviewsTab />}
      {tab === "offers" && <OffersTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Browse
// ─────────────────────────────────────────────────────────────────────────

function BrowseJobsTab() {
  const [search, setSearch] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);

  const filters: JobBrowseFilters = {
    search: search || undefined,
    employmentType: employmentType || undefined,
    isRemote: remoteOnly ? true : undefined,
  };

  const { data: jobs, isLoading, error } = useBrowseJobs(filters);
  const { data: savedIds } = useSavedJobIds();
  const toggleSaved = useToggleSavedJob();
  const [applyingJob, setApplyingJob] = useState<JobPostingWithPartner | null>(null);

  if (error) return <ErrorState title="Failed to load job postings" message={error.message} />;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="job-search" className="sr-only">Search jobs</label>
          <input
            id="job-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by title..."
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <label htmlFor="employment-type" className="sr-only">Employment type</label>
        <select id="employment-type" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold outline-none focus:border-primary">
          <option value="">All types</option>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold">
          <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} /> Remote only
        </label>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedIds?.has(job.id) ?? false}
              onToggleSave={() => toggleSaved.mutate({ jobPostingId: job.id, isSaved: savedIds?.has(job.id) ?? false })}
              onApply={() => setApplyingJob(job)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No open positions right now" message="Check back soon - new openings are added regularly." icon={<Briefcase className="size-10" aria-hidden="true" />} />
      )}

      {applyingJob && <ApplyModal job={applyingJob} onClose={() => setApplyingJob(null)} />}
    </div>
  );
}

function JobCard({
  job,
  isSaved,
  onToggleSave,
  onApply,
}: {
  job: JobPostingWithPartner;
  isSaved: boolean;
  onToggleSave: () => void;
  onApply: () => void;
}) {
  const { data: myApplication } = useMyApplicationForJob(job.id);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={job.hiring_partners?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.hiring_partners?.name ?? "?")}`}
            alt=""
            className="size-10 shrink-0 rounded-xl bg-muted object-cover"
          />
          <div>
            <h3 className="font-bold text-foreground">{job.title}</h3>
            <p className="text-xs font-semibold text-muted-foreground">{job.hiring_partners?.name}</p>
          </div>
        </div>
        <button onClick={onToggleSave} aria-label={isSaved ? "Unsave job" : "Save job"} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Heart className={`size-4 ${isSaved ? "fill-red-500 text-red-500" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-foreground/80">{job.description}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" /> {job.is_remote ? "Remote" : job.location || "Not specified"}</span>
        <span className="flex items-center gap-1"><Wallet className="size-3.5" aria-hidden="true" /> {formatPackage(job)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Badge variant="secondary" className="capitalize">{job.employment_type.replace("_", " ")}</Badge>
        {myApplication ? (
          <Badge variant={STAGE_VARIANTS[myApplication.status] ?? "muted"} className="capitalize">{STAGE_LABELS[myApplication.status] ?? myApplication.status}</Badge>
        ) : (
          <button onClick={onApply} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
}

function ApplyModal({ job, onClose }: { job: JobPostingWithPartner; onClose: () => void }) {
  const { user } = useAuth();
  const applyToJob = useApplyToJob();
  const [file, setFile] = useState<File | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async () => {
    if (!file) { toast.error("Upload a resume to apply."); return; }
    if (!user?.id) { toast.error("You must be signed in to apply."); return; }

    setIsUploading(true);
    try {
      const uploaded = await uploadFile("students", file, user.id);
      applyToJob.mutate(
        { jobPostingId: job.id, resumeFileId: uploaded.fileId, coverNote: coverNote || undefined },
        {
          onSuccess: () => { toast.success(`Applied to ${job.title}.`); onClose(); },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to submit application."),
        }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const isBusy = isUploading || applyToJob.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">Apply to {job.title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" aria-hidden="true" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="resume-upload" className="text-xs font-black text-foreground">Resume</label>
            <label htmlFor="resume-upload" className="mt-1 flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary focus-within:ring-2 focus-within:ring-ring">
              <Upload className="size-5" aria-hidden="true" />
              <span className="text-xs font-bold">{file ? file.name : "Click to upload PDF"}</span>
              <input id="resume-upload" type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div>
            <label htmlFor="apply-cover-note" className="text-xs font-black text-foreground">Cover Note (optional)</label>
            <textarea id="apply-cover-note" value={coverNote} onChange={(e) => setCoverNote(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border bg-muted p-3 text-sm outline-none focus:border-primary" />
          </div>
          <button
            onClick={() => void handleSubmit()}
            disabled={isBusy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// My Applications
// ─────────────────────────────────────────────────────────────────────────

function MyApplicationsTab() {
  const { data: applications, isLoading, error } = useMyApplications();
  const withdrawApplication = useWithdrawApplication();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (error) return <ErrorState title="Failed to load your applications" message={error.message} />;

  const handleWithdraw = (id: string, title: string) => {
    if (!window.confirm(`Withdraw your application to "${title}"?`)) return;
    withdrawApplication.mutate(id, {
      onSuccess: () => toast.success("Application withdrawn."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to withdraw."),
    });
  };

  return (
    <div className="space-y-3 pt-2">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
      ) : applications && applications.length > 0 ? (
        applications.map((app) => (
          <div key={app.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-foreground">{app.job_postings?.title ?? "Job posting removed"}</p>
                <p className="text-xs font-semibold text-muted-foreground">{app.job_postings?.hiring_partners?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STAGE_VARIANTS[app.status] ?? "muted"} className="capitalize">{STAGE_LABELS[app.status] ?? app.status}</Badge>
                <button
                  onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                  aria-expanded={expanded === app.id}
                  className="rounded text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {expanded === app.id ? "Hide" : "Details"}
                </button>
              </div>
            </div>

            {expanded === app.id && (
              <div className="mt-4 border-t border-border pt-4">
                <ApplicationTimeline applicationId={app.id} />
                {!["joined", "rejected", "withdrawn"].includes(app.status) && (
                  <button
                    onClick={() => handleWithdraw(app.id, app.job_postings?.title ?? "this job")}
                    disabled={withdrawApplication.isPending}
                    className="mt-3 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive-text hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    Withdraw Application
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <EmptyState title="No applications yet" message="Apply to open positions from the Browse Jobs tab." icon={<FileCheck2 className="size-10" aria-hidden="true" />} />
      )}
    </div>
  );
}

function ApplicationTimeline({ applicationId }: { applicationId: string }) {
  const { data: history } = useStatusHistory(applicationId);
  if (!history || history.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {history.map((h) => (
        <div key={h.id} className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground/80">{STAGE_LABELS[h.to_status] ?? h.to_status}</span>
          <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Interviews
// ─────────────────────────────────────────────────────────────────────────

function InterviewsTab() {
  const { data: interviews, isLoading, error } = useMyUpcomingInterviews();

  if (error) return <ErrorState title="Failed to load interviews" message={error.message} />;

  return (
    <div className="space-y-3 pt-2">
      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
      ) : interviews && interviews.length > 0 ? (
        interviews.map((meeting) => (
          <div key={meeting.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-bold text-foreground">{meeting.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden="true" /> {new Date(meeting.starts_at).toLocaleString()}
            </p>
            {meeting.meet_url && (
              <a
                href={meeting.meet_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block rounded text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Join Meeting Link <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        ))
      ) : (
        <EmptyState title="No upcoming interviews" message="Scheduled interview rounds will appear here." icon={<CalendarClock className="size-10" aria-hidden="true" />} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Offers & History
// ─────────────────────────────────────────────────────────────────────────

function OffersTab() {
  const { data: offers, isLoading, error } = useMyOffers();

  if (error) return <ErrorState title="Failed to load offers" message={error.message} />;

  return (
    <div className="space-y-3 pt-2">
      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
      ) : offers && offers.length > 0 ? (
        offers.map((offer) => (
          <div key={offer.id} className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-bold text-foreground">{offer.designation || "Offer"}</p>
              <Badge variant={offer.status === "accepted" ? "success" : "info"} className="capitalize">{offer.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {offer.package_amount} {offer.currency} · Joining {offer.joining_date ? new Date(offer.joining_date).toLocaleDateString() : "TBD"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Released {new Date(offer.released_at).toLocaleDateString()}</p>
          </div>
        ))
      ) : (
        <EmptyState title="No offers yet" message="Offers released to you will appear here." icon={<FileCheck2 className="size-10" aria-hidden="true" />} />
      )}
    </div>
  );
}
