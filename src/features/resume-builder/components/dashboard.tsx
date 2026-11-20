import { useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Download, Eye, FileText, LayoutTemplate, Loader2, MoreVertical, Pencil, RefreshCw, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useResumeMutations } from "@/hooks/student/useResumes";
import { getResume, toFriendlyResumeError, type ResumeStats, type ResumeSummary } from "@/services/resumes.service";
import { getActiveTemplates, templateDisplayName } from "../domain/templates";
import { ConfirmDialog, dialogMotionClass } from "./feedback";
import { inputClass } from "./form-model";
import { downloadResumePdf } from "../pdf-actions";
import { TemplatePicker } from "./TemplatePicker";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function ResumeStatsCards({ stats, loading }: { stats: ResumeStats | undefined; loading: boolean }) {
  const items = [
    { label: "Total resumes", value: stats?.totalCount },
    { label: "Completed (PDF generated)", value: stats?.completedCount },
    { label: "Drafts", value: stats?.draftCount },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <dt className="text-xs font-bold text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-2xl font-black text-foreground">{loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" aria-label="Loading" /> : (item.value ?? 0)}</dd>
        </div>
      ))}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <dt className="text-xs font-bold text-muted-foreground">Recently updated</dt>
        <dd className="mt-1 text-sm font-bold text-foreground">
          {loading ? (
            <span className="inline-block h-5 w-32 animate-pulse rounded bg-muted" aria-label="Loading" />
          ) : stats?.lastUpdated ? (
            <>
              <Link to={`/dashboard/resume-builder/${stats.lastUpdated.id}/edit`} className="line-clamp-1 hover:underline">
                {stats.lastUpdated.title}
              </Link>
              <span className="block text-xs font-semibold text-muted-foreground">{fmtDate(stats.lastUpdated.updatedAt)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No activity yet</span>
          )}
        </dd>
      </div>
    </dl>
  );
}

type DialogKind = "rename" | "template" | "delete" | "duplicate" | null;

export function ResumeCard({ resume, onDeleted }: { resume: ResumeSummary; onDeleted: () => void }) {
  const navigate = useNavigate();
  const { rename, changeTemplate, duplicate, remove, generatePdf } = useResumeMutations();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [downloading, setDownloading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hasPdf = !!resume.latest_pdf_path;
  const outdated = hasPdf && (resume.latest_generated_revision ?? 0) < resume.revision;
  const templatesExist = getActiveTemplates().length > 0;

  const closeDialog = () => {
    setDialog(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const download = async () => {
    if (!resume.latest_pdf_path) return;
    setDownloading(true);
    try {
      const detail = await getResume(resume.id);
      await downloadResumePdf(resume.latest_pdf_path, detail.resume_data.personal.fullName, resume.target_role);
    } catch (error) {
      toast.error(toFriendlyResumeError(error, "The PDF could not be downloaded.").message);
    } finally {
      setDownloading(false);
    }
  };

  const regenerate = () =>
    generatePdf.mutate(resume.id, {
      onSuccess: (r) => toast.success(r.alreadyRunning ? "Your PDF is already being generated." : "Resume PDF regenerated."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "PDF generation failed. Your resume is safe."),
    });

  return (
    <li className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-foreground">
              <Link to={`/dashboard/resume-builder/${resume.id}/edit`} className="line-clamp-2 hover:underline">
                {resume.title}
              </Link>
            </h3>
            {resume.target_role && <p className="line-clamp-1 text-xs font-semibold text-muted-foreground">Target role: {resume.target_role}</p>}
          </div>
        </div>
        {/* Non-modal: this menu opens dialogs; a modal menu + dialog can leave body pointer-events locked. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button ref={triggerRef} variant="ghost" size="icon" className="size-10 shrink-0" aria-label={`Actions for ${resume.title}`}>
              <MoreVertical className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={() => void navigate(hasPdf ? `/dashboard/resume-builder/${resume.id}/preview` : `/dashboard/resume-builder/${resume.id}/edit?step=9`)}>
              <Eye className="size-4" aria-hidden="true" /> {hasPdf ? "View resume PDF" : "View resume details"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void navigate(`/dashboard/resume-builder/${resume.id}/edit`)}>
              <Pencil className="size-4" aria-hidden="true" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog("duplicate")}>
              <Copy className="size-4" aria-hidden="true" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog("rename")}>
              <Type className="size-4" aria-hidden="true" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog("template")}>
              <LayoutTemplate className="size-4" aria-hidden="true" /> Change template
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!hasPdf || downloading} onSelect={() => void download()}>
              <Download className="size-4" aria-hidden="true" /> {hasPdf ? "Download PDF" : "Download PDF (no PDF generated yet)"}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!templatesExist || !resume.template_id || generatePdf.isPending} onSelect={regenerate}>
              <RefreshCw className="size-4" aria-hidden="true" /> {!templatesExist ? "Regenerate PDF (templates coming soon)" : !resume.template_id ? "Regenerate PDF (choose a template first)" : "Regenerate PDF"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-destructive-text focus:text-destructive-text">
              <Trash2 className="size-4" aria-hidden="true" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="font-bold text-muted-foreground">Status</dt>
          <dd className="font-semibold text-foreground">{resume.status === "completed" ? (outdated ? "Completed (PDF outdated)" : "Completed") : "Draft"}</dd>
        </div>
        <div>
          <dt className="font-bold text-muted-foreground">Template</dt>
          <dd className="line-clamp-1 font-semibold text-foreground">{templateDisplayName(resume.template_id)}</dd>
        </div>
        <div>
          <dt className="font-bold text-muted-foreground">Created</dt>
          <dd className="font-semibold text-foreground">{fmtDate(resume.created_at)}</dd>
        </div>
        <div>
          <dt className="font-bold text-muted-foreground">Updated</dt>
          <dd className="font-semibold text-foreground">{fmtDate(resume.updated_at)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        <Button asChild size="sm">
          <Link to={`/dashboard/resume-builder/${resume.id}/edit`} aria-label={`${resume.status === "draft" ? "Continue editing" : "Edit"} ${resume.title}`}>
            <Pencil className="size-3.5" aria-hidden="true" /> {resume.status === "draft" ? "Continue editing" : "Edit"}
          </Link>
        </Button>
        {hasPdf && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/dashboard/resume-builder/${resume.id}/preview`} aria-label={`Preview ${resume.title} PDF`}>
              <Eye className="size-3.5" aria-hidden="true" /> Preview
            </Link>
          </Button>
        )}
      </div>

      <RenameDialog
        open={dialog === "rename"}
        initial={resume.title}
        heading={`Rename “${resume.title}”`}
        submitLabel="Save name"
        pending={rename.isPending}
        onClose={closeDialog}
        onSubmit={(title) =>
          rename.mutate(
            { id: resume.id, title },
            { onSuccess: () => { toast.success("Resume renamed."); closeDialog(); }, onError: (e) => toast.error(toFriendlyResumeError(e).message) },
          )
        }
      />
      <RenameDialog
        open={dialog === "duplicate"}
        initial={`${resume.title} (Copy)`.slice(0, 120)}
        heading={`Duplicate “${resume.title}”`}
        description="A separate copy is created as a new draft. The original resume is not changed."
        submitLabel="Create copy"
        pending={duplicate.isPending}
        onClose={closeDialog}
        onSubmit={(title) =>
          duplicate.mutate(
            { id: resume.id, title },
            {
              onSuccess: (copy) => {
                toast.success("Copy created.");
                setDialog(null);
                void navigate(`/dashboard/resume-builder/${copy.id}/edit`);
              },
              onError: (e) => toast.error(toFriendlyResumeError(e).message),
            },
          )
        }
      />
      <ChangeTemplateDialog
        open={dialog === "template"}
        resume={resume}
        pending={changeTemplate.isPending}
        onClose={closeDialog}
        onSubmit={(templateId) =>
          changeTemplate.mutate(
            { id: resume.id, templateId },
            { onSuccess: () => { toast.success("Template changed. Your content is unchanged; generate an updated PDF to apply it."); closeDialog(); }, onError: (e) => toast.error(toFriendlyResumeError(e).message) },
          )
        }
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
        title={`Delete “${resume.title}”?`}
        description="Are you sure you want to delete this resume? Its versions and generated PDFs are deleted too. This action cannot be undone."
        confirmLabel="Delete resume"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(resume.id, {
            onSuccess: () => {
              setDialog(null);
              toast.success("Resume deleted.");
              onDeleted();
            },
            onError: (e) => toast.error(e instanceof Error && /files/.test(e.message) ? e.message : toFriendlyResumeError(e, "The resume could not be deleted. Please try again.").message),
          })
        }
      />
    </li>
  );
}

type RenameDialogProps = {
  open: boolean; initial: string; heading: string; description?: string; submitLabel: string; pending: boolean; onClose: () => void; onSubmit: (title: string) => void;
};

function RenameDialog(props: RenameDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && !props.pending && props.onClose()}>
      {/* Mounted only while open, so the field always starts from the current title. */}
      {props.open && <RenameDialogBody {...props} />}
    </Dialog>
  );
}

function RenameDialogBody({ initial, heading, description, submitLabel, pending, onClose, onSubmit }: RenameDialogProps) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <DialogContent
      className={dialogMotionClass}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return setError("Enter a title.");
          onSubmit(value.trim());
        }}
        className="space-y-4"
      >
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{description ?? "Only you see resume titles. Use one that helps you find it later."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs font-bold">
            Resume title
          </Label>
          <input
            ref={inputRef}
            id={id}
            value={value}
            maxLength={120}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={inputClass}
          />
          {error && (
            <p id={`${id}-error`} className="text-xs font-semibold text-destructive-text">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

type ChangeTemplateProps = { open: boolean; resume: ResumeSummary; pending: boolean; onClose: () => void; onSubmit: (id: string) => void };

function ChangeTemplateDialog(props: ChangeTemplateProps) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && !props.pending && props.onClose()}>
      {props.open && <ChangeTemplateBody {...props} />}
    </Dialog>
  );
}

function ChangeTemplateBody({ resume, pending, onClose, onSubmit }: ChangeTemplateProps) {
  const [selected, setSelected] = useState<string | null>(resume.template_id);
  const templatesExist = getActiveTemplates().length > 0;
  return (
    <DialogContent className={`${dialogMotionClass} max-w-3xl`}>
      <DialogHeader>
        <DialogTitle id="change-template-title">Change template for “{resume.title}”</DialogTitle>
        <DialogDescription>
          {templatesExist ? "Your resume content stays exactly the same; only the layout changes. Generate an updated PDF afterwards." : "No resume templates are available yet. Your content is saved and will work with every template once they are ready."}
        </DialogDescription>
      </DialogHeader>
      {templatesExist && <TemplatePicker value={selected} onChange={setSelected} labelledBy="change-template-title" />}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          {templatesExist ? "Cancel" : "Close"}
        </Button>
        {templatesExist && (
          <Button type="button" disabled={pending || !selected || selected === resume.template_id} onClick={() => selected && onSubmit(selected)}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Apply template
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
