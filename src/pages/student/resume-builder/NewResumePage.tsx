import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLoadProfileImportSource, useResumeMutations } from "@/hooks/student/useResumes";
import { toFriendlyResumeError } from "@/services/resumes.service";
import { inputClass } from "@/features/resume-builder/components/form-model";
import { TemplatePicker } from "@/features/resume-builder/components/TemplatePicker";
import { mapProfileToResumeData, mergeImportedData } from "@/features/resume-builder/domain/profile-import";
import { emptyResumeData } from "@/features/resume-builder/domain/resume-schema";

export default function NewResumePage() {
  const navigate = useNavigate();
  const { create } = useResumeMutations();
  const loadSource = useLoadProfileImportSource();
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [start, setStart] = useState<"profile" | "blank">("profile");
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const roleId = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const finalTitle = title.trim() || (targetRole.trim() ? `${targetRole.trim()} Resume` : "");
    if (!finalTitle) {
      setTitleError("Enter a resume title or a target job role.");
      document.getElementById(titleId)?.focus();
      return;
    }
    setBusy(true);
    try {
      let data = emptyResumeData();
      if (start === "profile") {
        // Profile import is best-effort: a failure falls back to a blank resume rather than blocking creation.
        try {
          data = mergeImportedData(data, mapProfileToResumeData(await loadSource())).data;
        } catch {
          /* continue with a blank resume */
        }
      }
      const created = await create.mutateAsync({ title: finalTitle, targetRole, templateId, data });
      void navigate(`/dashboard/resume-builder/${created.id}/edit?step=1`, { replace: true });
    } catch (err) {
      setError(toFriendlyResumeError(err, "Your resume could not be created. Please try again.").message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/dashboard/resume-builder" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> My Resumes
        </Link>
        <h1 className="text-2xl font-black text-foreground">Create New Resume</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start with the basics. You can change everything later, including the template.</p>
      </div>

      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={titleId} className="text-xs font-bold">
              Resume title
            </Label>
            <input
              id={titleId}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null);
              }}
              maxLength={120}
              placeholder="e.g. Software Developer Resume"
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? `${titleId}-error` : undefined}
              className={inputClass}
            />
            {titleError && (
              <p id={`${titleId}-error`} className="text-xs font-semibold text-destructive-text">
                {titleError}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={roleId} className="text-xs font-bold">
              Target job role
            </Label>
            <input id={roleId} value={targetRole} onChange={(e) => setTargetRole(e.target.value)} maxLength={120} placeholder="e.g. Frontend Developer" className={inputClass} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 id="new-template-heading" className="text-base font-black text-foreground">
            Choose a template
          </h2>
          <TemplatePicker value={templateId} onChange={setTemplateId} labelledBy="new-template-heading" />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-base font-black text-foreground">How would you like to start?</legend>
          {(
            [
              ["profile", "Import from my Skill Guru profile", "Prefill your contact details, education, skills, experience and projects. Your profile itself is not changed."],
              ["blank", "Start with a blank resume", "Fill in everything yourself."],
            ] as const
          ).map(([value, label, description]) => (
            <label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 focus-within:ring-2 focus-within:ring-ring has-[:checked]:border-primary">
              <input type="radio" name="start" value={value} checked={start === value} onChange={() => setStart(value)} className="mt-1 size-5 accent-primary" />
              <span>
                <span className="block text-sm font-bold text-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {error && (
          <p role="alert" className="text-sm font-semibold text-destructive-text">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard/resume-builder">Cancel</Link>
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Create resume
          </Button>
        </div>
      </form>
    </div>
  );
}
