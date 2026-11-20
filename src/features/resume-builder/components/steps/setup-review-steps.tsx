import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Download, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLoadProfileImportSource } from "@/hooks/student/useResumes";
import type { ResumeDetail } from "@/services/resumes.service";
import { mapProfileToResumeData, mergeImportedData } from "../../domain/profile-import";
import { AiAnalysisPanel, ImproveWholeResumePanel, JobMatchPanel, KeywordSuggestionsPanel } from "../ai/AiReviewPanels";
import { ConfirmDialog } from "../feedback";
import { StepSection, TextField } from "../form-fields";
import { type EditorValues } from "../form-model";
import { PdfPanel, QualityPanel } from "../review-tools";
import { TemplatePicker } from "../TemplatePicker";

type StepProps = { headingRef: React.Ref<HTMLHeadingElement> };

/** Pulls the student's existing Skill Guru profile into THIS resume only (the profile itself is never changed). */
export function ImportFromProfileButton() {
  const { getValues, reset } = useFormContext<EditorValues>();
  const loadSource = useLoadProfileImportSource();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const imported = mapProfileToResumeData(await loadSource());
      const current = getValues();
      const { data, addedCount } = mergeImportedData(current.data, imported);
      // keepDirtyValues=false + keepDefaultValues: we want the form dirty so autosave persists it.
      reset({ ...current, data }, { keepDefaultValues: true });
      setOpen(false);
      toast[addedCount ? "success" : "info"](addedCount ? `Imported ${addedCount} item${addedCount === 1 ? "" : "s"} from your profile. Review and edit them as needed.` : "Nothing new to import — your resume already includes your profile details.");
    } catch {
      toast.error("Your profile could not be loaded. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Download className="size-4" aria-hidden="true" /> Import from my profile
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Import from your Skill Guru profile?"
        description="Empty fields in this resume will be filled from your profile, and profile entries (education, experience, projects, certifications, achievements, skills) that are not already here will be added. Nothing you have typed is overwritten, and your profile itself is not changed."
        confirmLabel="Import details"
        destructive={false}
        pending={busy}
        onConfirm={() => void run()}
      />
    </>
  );
}

export function SetupStep({ headingRef }: StepProps) {
  const { control } = useFormContext<EditorValues>();
  return (
    <StepSection headingRef={headingRef} title="Resume Setup" description="Name this resume and choose the role it targets. You can create separate resumes for different roles.">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="title" label="Resume title" required maxLength={120} hint="Only you see this, e.g. Software Developer Resume" />
        <TextField name="targetRole" label="Target job role" maxLength={120} hint="e.g. Frontend Developer, Data Analyst" />
      </div>
      <div className="space-y-2">
        <h3 id="template-choice-heading" className="text-base font-black text-foreground">
          Resume template
        </h3>
        <Controller control={control} name="templateId" render={({ field }) => <TemplatePicker value={field.value} onChange={field.onChange} labelledBy="template-choice-heading" />} />
      </div>
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="mb-3 text-sm text-muted-foreground">Already filled in your Skill Guru profile? Bring those details into this resume.</p>
        <ImportFromProfileButton />
      </div>
    </StepSection>
  );
}

const SECTIONS: { step: number; label: string; count: (v: EditorValues) => string }[] = [
  { step: 1, label: "Personal Information", count: (v) => (v.data.personal.fullName ? v.data.personal.fullName : "Not filled in") },
  { step: 2, label: "Professional Summary", count: (v) => (v.data.summary.summary.trim() || v.data.summary.objective.trim() ? "Added" : "Not added") },
  { step: 3, label: "Education", count: (v) => `${v.data.education.length} entr${v.data.education.length === 1 ? "y" : "ies"}` },
  { step: 4, label: "Experience and Internships", count: (v) => `${v.data.experience.length} entr${v.data.experience.length === 1 ? "y" : "ies"}` },
  { step: 5, label: "Projects", count: (v) => `${v.data.projects.length} project${v.data.projects.length === 1 ? "" : "s"}` },
  { step: 6, label: "Skills", count: (v) => `${v.data.skills.reduce((n, g) => n + g.items.length, 0)} skills` },
  { step: 7, label: "Certifications", count: (v) => `${v.data.certifications.length}` },
  { step: 8, label: "Achievements and additional", count: (v) => `${v.data.achievements.length + v.data.languages.length + v.data.additional.length} entries` },
];

export function ReviewStep({ headingRef, resume, goToStep, beforeGenerate }: StepProps & { resume: ResumeDetail; goToStep: (step: number) => void; beforeGenerate: () => Promise<boolean> }) {
  const values = useWatch<EditorValues>() as EditorValues;
  if (!values?.data) return <Loader2 className="size-5 animate-spin" aria-label="Loading" />;
  return (
    <StepSection headingRef={headingRef} title="Review, Improve and Generate" description="Check every section, improve your writing with AI if you like, then generate your PDF.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-bold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.count(values)}</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => goToStep(s.step)} aria-label={`Edit ${s.label}`}>
              <Pencil className="size-3.5" aria-hidden="true" /> Edit
            </Button>
          </li>
        ))}
      </ul>
      <PdfPanel resume={{ ...resume, template_id: values.templateId, target_role: values.targetRole || null }} data={values.data} beforeGenerate={beforeGenerate} />
      <QualityPanel data={values.data} targetRole={values.targetRole} />
      <ImproveWholeResumePanel />
      <KeywordSuggestionsPanel />
      <JobMatchPanel />
      <AiAnalysisPanel />
    </StepSection>
  );
}
