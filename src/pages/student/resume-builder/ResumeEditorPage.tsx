// Resume editor: the 10-step wizard for one resume. Owns the form state and
// autosave; every step writes into the same structured document.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { resumesKeys, useInvalidateResumes, useResumeDetail } from "@/hooks/student/useResumes";
import type { ResumeDetail } from "@/services/resumes.service";
import { RESUME_STEPS, buildPatch, toEditorValues } from "@/features/resume-builder/editor-model";
import { getFormatErrors } from "@/features/resume-builder/domain/resume-schema";
import { useResumeAutosave } from "@/features/resume-builder/hooks/useResumeAutosave";
import { ResumeAiProvider } from "@/features/resume-builder/components/ai/ai-context";
import { ConfirmDialog, ConflictBanner, SaveStatusIndicator } from "@/features/resume-builder/components/feedback";
import { FormatErrorsContext, type EditorValues } from "@/features/resume-builder/components/form-model";
import { VersionHistoryButton } from "@/features/resume-builder/components/review-tools";
import { WizardStepper } from "@/features/resume-builder/components/WizardStepper";
import {
  AdditionalStep,
  CertificationsStep,
  EducationStep,
  ExperienceStep,
  PersonalStep,
  ProjectsStep,
  SkillsStep,
  SummaryStep,
} from "@/features/resume-builder/components/steps/content-steps";
import { ReviewStep, SetupStep } from "@/features/resume-builder/components/steps/setup-review-steps";

export default function ResumeEditorPage() {
  const { resumeId } = useParams();
  const { data: resume, isLoading, error } = useResumeDetail(resumeId);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  if (error || !resume) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-black text-foreground">Resume not found</h1>
        <p className="text-sm text-muted-foreground">{error?.name === "ResumeNotFoundError" ? "This resume no longer exists. It may have been deleted." : "This resume could not be loaded. Check your connection and try again."}</p>
        <Button asChild variant="outline">
          <Link to="/dashboard/resume-builder">Back to My Resumes</Link>
        </Button>
      </div>
    );
  }
  return <ResumeEditor key={resume.id} resume={resume} />;
}

function ResumeEditor({ resume }: { resume: ResumeDetail }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateResumes();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStep = Math.min(Math.max(Number(searchParams.get("step") ?? 0) || 0, 0), RESUME_STEPS.length - 1);
  const [step, setStep] = useState(initialStep);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([initialStep]));
  const [showErrorsFor, setShowErrorsFor] = useState<Set<number>>(new Set());
  const [resolving, setResolving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const form = useForm<EditorValues>({ defaultValues: toEditorValues(resume), mode: "onTouched" });
  const values = useWatch({ control: form.control }) as EditorValues;

  const autosave = useResumeAutosave({
    resumeId: resume.id,
    initialRevision: resume.revision,
    onSaved: (detail) => {
      queryClient.setQueryData(resumesKeys.detail(user?.id ?? "", detail.id), detail);
      invalidate();
    },
  });
  const { schedule, markSaved, flush } = autosave;

  // The loaded document is already persisted: never re-save it untouched.
  useEffect(() => {
    markSaved(buildPatch(toEditorValues(resume)), resume.revision);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount for this resume
  }, []);

  // Any change (typing, AI accept, import, reorder) schedules a debounced save.
  useEffect(() => {
    if (firstRender.current) return;
    if (form.formState.isDirty || Object.keys(form.formState.dirtyFields).length > 0) schedule(buildPatch(form.getValues()));
  }, [values, schedule, form]);

  // Focus the step heading after navigation (not on first load) and keep the URL shareable.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [step]);

  const formatErrors = useMemo(() => {
    const raw = values?.data ? getFormatErrors(values.data) : {};
    const errors: Record<string, string> = {};
    for (const [path, message] of Object.entries(raw)) errors[`data.${path}`] = message;
    if (!values?.title?.trim()) errors.title = "Give this resume a title so you can find it later.";
    return errors;
  }, [values]);

  const errorSteps = useMemo(() => {
    const set = new Set<number>();
    RESUME_STEPS.forEach((s, i) => {
      if (Object.keys(formatErrors).some((path) => s.prefixes.some((p) => path === p || path.startsWith(`${p}.`)))) set.add(i);
    });
    return set;
  }, [formatErrors]);

  const goTo = useCallback(
    (index: number) => {
      void flush(buildPatch(form.getValues()));
      setStep(index);
      setVisited((v) => new Set(v).add(index));
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set("step", String(index));
        return next;
      }, { replace: true });
    },
    [flush, form, setSearchParams],
  );

  const next = () => {
    if (errorSteps.has(step)) {
      setShowErrorsFor((s) => new Set(s).add(step));
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    goTo(step + 1);
  };

  const ensureSaved = useCallback(() => flush(buildPatch(form.getValues())), [flush, form]);

  const saveDraft = async (exit: boolean) => {
    const ok = await ensureSaved();
    if (ok) {
      toast.success(exit ? "Draft saved." : "Draft saved. You can continue any time from My Resumes.");
      if (exit) void navigate("/dashboard/resume-builder");
    } else if (autosave.status !== "conflict") {
      toast.error("Your changes could not be saved. Please try again.");
    }
  };

  // Warn before closing the tab with unsaved edits; flush on in-app navigation.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autosave.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [autosave]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname && autosave.hasUnsavedChanges());
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    void ensureSaved().then((ok) => {
      if (ok) blocker.proceed();
    });
  }, [blocker, ensureSaved]);

  const resolveConflict = async (choice: "reload" | "keep-mine") => {
    setResolving(true);
    const latest = await autosave.resolveConflict(choice);
    if (latest) {
      form.reset(toEditorValues(latest));
      markSaved(buildPatch(toEditorValues(latest)), latest.revision);
      toast.info("Loaded the latest saved version.");
    }
    setResolving(false);
  };

  const onRestored = (detail: ResumeDetail) => {
    form.reset(toEditorValues(detail));
    markSaved(buildPatch(toEditorValues(detail)), detail.revision);
  };

  const stepErrors = showErrorsFor.has(step) ? Object.entries(formatErrors).filter(([path]) => RESUME_STEPS[step]!.prefixes.some((p) => path === p || path.startsWith(`${p}.`))) : [];
  const currentResume = queryClient.getQueryData<ResumeDetail>(resumesKeys.detail(user?.id ?? "", resume.id)) ?? resume;
  const stepProps = { headingRef };

  return (
    <FormProvider {...form}>
      <FormatErrorsContext.Provider value={{ errors: formatErrors, showAll: showErrorsFor.has(step) }}>
        <ResumeAiProvider resumeId={resume.id} targetRole={values?.targetRole ?? ""} ensureSaved={ensureSaved}>
          <div className="space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to="/dashboard/resume-builder" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> My Resumes
                </Link>
                <h1 className="truncate text-2xl font-black text-foreground">{values?.title?.trim() || "Untitled resume"}</h1>
                <SaveStatusIndicator status={autosave.status} errorMessage={autosave.errorMessage} lastSavedAt={autosave.lastSavedAt} onRetry={() => void ensureSaved()} />
              </div>
              <div className="flex flex-wrap gap-2">
                <VersionHistoryButton resume={currentResume} beforeRestore={async () => ((await ensureSaved()) ? autosave.getRevision() : null)} onRestored={onRestored} />
                {currentResume.latest_pdf_path && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/dashboard/resume-builder/${resume.id}/preview`}>
                      <Eye className="size-4" aria-hidden="true" /> Preview PDF
                    </Link>
                  </Button>
                )}
              </div>
            </header>

            {autosave.status === "conflict" && <ConflictBanner busy={resolving} onReload={() => void resolveConflict("reload")} onKeepMine={() => void resolveConflict("keep-mine")} />}

            <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
              <aside className="lg:sticky lg:top-4 lg:self-start">
                <WizardStepper steps={RESUME_STEPS} current={step} visited={visited} errorSteps={errorSteps} onSelect={goTo} />
              </aside>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  if (step < RESUME_STEPS.length - 1) next();
                }}
                className="min-w-0 space-y-6"
              >
                {stepErrors.length > 0 && (
                  <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm outline-none">
                    <p className="font-bold text-destructive-text">Please fix {stepErrors.length} field{stepErrors.length === 1 ? "" : "s"} before continuing:</p>
                    <ul className="mt-1 list-disc pl-5 text-foreground">
                      {stepErrors.map(([path, message]) => (
                        <li key={path}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {step === 0 && <SetupStep {...stepProps} />}
                {step === 1 && <PersonalStep {...stepProps} />}
                {step === 2 && <SummaryStep {...stepProps} />}
                {step === 3 && <EducationStep {...stepProps} />}
                {step === 4 && <ExperienceStep {...stepProps} />}
                {step === 5 && <ProjectsStep {...stepProps} />}
                {step === 6 && <SkillsStep {...stepProps} />}
                {step === 7 && <CertificationsStep {...stepProps} />}
                {step === 8 && <AdditionalStep {...stepProps} />}
                {step === 9 && <ReviewStep {...stepProps} resume={currentResume} goToStep={goTo} beforeGenerate={ensureSaved} />}

                <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
                  <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={step === 0}>
                    <ArrowLeft className="size-4" aria-hidden="true" /> Previous
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" onClick={() => void saveDraft(false)}>
                      <Save className="size-4" aria-hidden="true" /> Save draft
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void saveDraft(true)}>
                      Save and exit
                    </Button>
                    {step < RESUME_STEPS.length - 1 && (
                      <Button type="submit">
                        Next <ArrowRight className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>

          <ConfirmDialog
            open={blocker.state === "blocked" && (autosave.status === "error" || autosave.status === "conflict")}
            onOpenChange={(open) => !open && blocker.state === "blocked" && blocker.reset()}
            title="Leave without saving?"
            description="Your latest changes could not be saved. If you leave now, they will be lost."
            confirmLabel="Leave anyway"
            onConfirm={() => blocker.state === "blocked" && blocker.proceed()}
          />
        </ResumeAiProvider>
      </FormatErrorsContext.Provider>
    </FormProvider>
  );
}
