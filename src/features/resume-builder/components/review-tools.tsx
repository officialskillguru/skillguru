import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleAlert, Download, Eye, FileClock, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useLatestPdfJob, useResumeMutations, useResumeVersions } from "@/hooks/student/useResumes";
import { EdgeFunctionError, type ResumeDetail, type ResumeVersionRow } from "@/services/resumes.service";
import { downloadResumePdf } from "../pdf-actions";
import { analyzeResumeQuality } from "../domain/quality-check";
import { getGenerationIssues, parseStoredResumeData, type ResumeData } from "../domain/resume-schema";
import { getActiveTemplates, isTemplateSelectable, templateDisplayName } from "../domain/templates";
import { ConfirmDialog, dialogMotionClass } from "./feedback";
import { inputClass } from "./form-model";

// ─── Quality checker ─────────────────────────────────────────────────────────

export function QualityPanel({ data, targetRole }: { data: ResumeData; targetRole: string }) {
  const report = analyzeResumeQuality(data, targetRole);
  const headingId = useId();
  const categories = Array.from(new Set(report.checks.map((c) => c.category)));
  return (
    <section aria-labelledby={headingId} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div>
        <h3 id={headingId} className="text-base font-black text-foreground">
          Resume Quality Checker
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A transparent checklist of good resume practice. It is not an employer ATS score and does not predict hiring outcomes. Every point is explained below.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-black text-foreground">
          {report.score}/{report.maxScore} — {report.level}
        </p>
        <Progress value={report.score} max={report.maxScore} aria-label="Resume quality score" aria-valuetext={`${report.score} of ${report.maxScore}, ${report.level}`} className="h-2.5" />
        <p className="text-xs text-muted-foreground">About {report.wordCount} words.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((category) => {
          const checks = report.checks.filter((c) => c.category === category);
          const earned = checks.reduce((s, c) => s + c.earned, 0);
          const total = checks.reduce((s, c) => s + c.points, 0);
          return (
            <div key={category}>
              <h4 className="text-sm font-black text-foreground">
                {category} <span className="font-semibold text-muted-foreground">({earned}/{total})</span>
              </h4>
              <ul className="mt-1.5 space-y-1.5">
                {checks.map((c) => {
                  const passed = c.earned === c.points;
                  return (
                    <li key={c.id} className="flex gap-2 text-sm">
                      {passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                      <span>
                        <span className="sr-only">{passed ? "Passed: " : "Needs work: "}</span>
                        <span className="text-foreground">{c.label}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          ({c.earned}/{c.points} points)
                        </span>
                        {c.suggestion && <span className="block text-xs text-muted-foreground">{c.suggestion}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground">
        <p className="font-bold">Not assessed here:</p>
        <ul className="list-disc pl-5">
          {report.notAssessed.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── PDF generation ──────────────────────────────────────────────────────────

const JOB_ERROR_TEXT: Record<string, string> = {
  PDF_NOT_CONFIGURED: "PDF generation is not yet configured.",
  TEMPLATE_NOT_AVAILABLE: "The selected template is not available. Choose another template.",
  UNSUPPORTED_CHARACTERS: "Your resume contains characters this template cannot print.",
  COMPILE_TIMEOUT: "PDF generation took too long.",
  PDF_TOO_MANY_PAGES: "Your resume is longer than 4 pages; shorten some descriptions.",
  RATE_LIMITED: "Daily PDF generation limit reached. Try again tomorrow.",
  STALE_JOB: "The previous attempt did not finish.",
};

export function PdfPanel({ resume, data, beforeGenerate, headingLevel = 3 }: { resume: ResumeDetail; data: ResumeData; beforeGenerate: () => Promise<boolean>; headingLevel?: 2 | 3 }) {
  const Heading = `h${headingLevel}` as const;
  const { generatePdf } = useResumeMutations();
  const job = useLatestPdfJob(resume.id);
  const [message, setMessage] = useState<string | null>(null);
  const templatesExist = getActiveTemplates().length > 0;
  const issues = getGenerationIssues(data, isTemplateSelectable(resume.template_id) ? resume.template_id : null);
  const running = generatePdf.isPending || (job.data && ["pending", "processing"].includes(job.data.status));
  const hasPdf = !!resume.latest_pdf_path;
  const outdated = hasPdf && (resume.latest_generated_revision ?? 0) < resume.revision;

  const generate = async () => {
    setMessage(null);
    if (!(await beforeGenerate())) {
      setMessage("Save your latest changes first, then generate the PDF.");
      return;
    }
    generatePdf.mutate(resume.id, {
      onSuccess: (r) => {
        if (r.alreadyRunning) setMessage("Your PDF is already being generated.");
        else {
          setMessage("Resume generated successfully.");
          toast.success("Resume generated successfully.");
        }
      },
      onError: (error) => setMessage(error instanceof EdgeFunctionError ? error.message : "We couldn't generate your PDF right now. Your resume is saved; please try again."),
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby="pdf-panel-heading">
      <Heading id="pdf-panel-heading" className="text-base font-black text-foreground">
        Generate PDF
      </Heading>
      {!templatesExist ? (
        <p className="text-sm text-muted-foreground">
          PDF generation will be available as soon as the professional resume templates are ready. Your resume is saved and will work with every template — nothing you enter now will be lost.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Template: {templateDisplayName(resume.template_id)}</p>
          {issues.length > 0 && (
            <div>
              <p className="text-sm font-bold text-foreground">Before generating, please:</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                {issues.map((i) => (
                  <li key={i.message}>
                    {i.section}: {i.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button type="button" onClick={() => void generate()} disabled={issues.length > 0 || !!running}>
            {running && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {running ? "Generating PDF…" : hasPdf ? "Generate updated PDF" : "Generate Resume"}
          </Button>
        </>
      )}
      <div role="status" aria-live="polite" className="text-sm">
        {message && <p className="font-semibold text-foreground">{message}</p>}
        {!message && job.data?.status === "failed" && (
          <p className="text-destructive-text">Last attempt failed: {JOB_ERROR_TEXT[job.data.error_code ?? ""] ?? "PDF generation failed."} Your resume data is safe.</p>
        )}
      </div>
      {hasPdf && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {outdated && <p className="w-full text-xs font-semibold text-amber-700 dark:text-amber-400">Your PDF is older than your latest edits. Generate an updated PDF to include them.</p>}
          <Button asChild variant="outline" size="sm">
            <Link to={`/dashboard/resume-builder/${resume.id}/preview`}>
              <Eye className="size-4" aria-hidden="true" /> Preview PDF
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void downloadResumePdf(resume.latest_pdf_path!, data.personal.fullName, resume.target_role)}>
            <Download className="size-4" aria-hidden="true" /> Download PDF
          </Button>
        </div>
      )}
    </section>
  );
}

// ─── Version history ─────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = { manual: "Saved version", generated: "Generated PDF", restore_backup: "Automatic backup" };
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function VersionHistoryButton({ resume, beforeRestore, onRestored }: { resume: ResumeDetail; beforeRestore: () => Promise<number | null>; onRestored: (detail: ResumeDetail) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [confirm, setConfirm] = useState<ResumeVersionRow | null>(null);
  const labelId = useId();
  const versions = useResumeVersions(resume.id, open);
  const { createVersion, restoreVersion } = useResumeMutations();

  const saveVersion = async () => {
    if ((await beforeRestore()) === null) return toast.error("Save your latest changes first, then try again.");
    createVersion.mutate(
      { id: resume.id, label },
      { onSuccess: () => { setLabel(""); toast.success("Version saved."); }, onError: () => toast.error("The version could not be saved. Please try again.") },
    );
  };

  const restore = async (version: ResumeVersionRow) => {
    const revision = await beforeRestore();
    if (revision === null) return toast.error("Save your latest changes first, then try again.");
    restoreVersion.mutate(
      { versionId: version.id, expectedRevision: revision },
      {
        onSuccess: (detail) => {
          setConfirm(null);
          setOpen(false);
          onRestored(detail);
          toast.success(`Version ${version.version_number} restored. Your previous content was saved as a backup version.`);
        },
        onError: (error) => toast.error(error instanceof Error && /changed elsewhere/.test(error.message) ? error.message : "The version could not be restored. Please try again."),
      },
    );
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <History className="size-4" aria-hidden="true" /> Version history
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${dialogMotionClass} max-w-xl`}>
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>Snapshots of “{resume.title}”. Restoring creates a new revision and first backs up your current content.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveVersion();
            }}
          >
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label htmlFor={labelId} className="text-xs font-bold">
                Version label (optional)
              </Label>
              <input id={labelId} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="e.g. Before adding internship" className={inputClass} />
            </div>
            <Button type="submit" disabled={createVersion.isPending}>
              {createVersion.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save current version
            </Button>
          </form>
          <div className="max-h-[50vh] overflow-y-auto">
            {versions.isLoading && <p className="text-sm text-muted-foreground">Loading versions…</p>}
            {versions.isError && <p role="alert" className="text-sm text-destructive-text">Versions could not be loaded.</p>}
            {versions.data?.length === 0 && <p className="text-sm text-muted-foreground">No versions yet. Save one above, or generate a PDF.</p>}
            <ul className="space-y-2">
              {versions.data?.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <div className="flex items-start gap-2">
                    <FileClock className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Version {v.version_number} · {SOURCE_LABEL[v.source] ?? v.source}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(v.created_at)}
                        {v.label ? ` · ${v.label}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {v.pdf_storage_path && (
                      <Button type="button" size="sm" variant="outline" onClick={() => void downloadResumePdf(v.pdf_storage_path!, parseStoredResumeData(v.resume_data_snapshot).personal.fullName, v.target_role)} aria-label={`Download PDF of version ${v.version_number} from ${fmt(v.created_at)}`}>
                        <Download className="size-3.5" aria-hidden="true" /> PDF
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirm(v)} aria-label={`Restore version ${v.version_number} from ${fmt(v.created_at)}`}>
                      Restore
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Restore version ${confirm?.version_number ?? ""}?`}
        description="Your resume content will be replaced with this version. Your current content is saved as a backup version first, so you can switch back."
        confirmLabel="Restore version"
        destructive={false}
        pending={restoreVersion.isPending}
        onConfirm={() => confirm && void restore(confirm)}
      />
    </>
  );
}
