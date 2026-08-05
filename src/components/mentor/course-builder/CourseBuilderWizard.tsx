import { useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker, useNavigate, type BlockerFunction } from "react-router-dom";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { useMentorCourse } from "@/hooks/useMentorPortal";
import { BasicInfoStep } from "@/components/mentor/course-builder/steps/BasicInfoStep";
import { PricingStep } from "@/components/mentor/course-builder/steps/PricingStep";
import { MediaStep } from "@/components/mentor/course-builder/steps/MediaStep";
import { CurriculumStep } from "@/components/mentor/course-builder/steps/CurriculumStep";
import { OutcomesStep } from "@/components/mentor/course-builder/steps/OutcomesStep";
import { ReviewStep } from "@/components/mentor/course-builder/steps/ReviewStep";
import { BUILDER_STEPS, type BuilderStepKey } from "@/components/mentor/course-builder/types";

interface CourseBuilderWizardProps {
  /** Present in edit mode (/mentor/courses/:courseId/edit), absent in create mode (/mentor/courses/new). */
  courseId?: string;
  /** Lets workspace row actions (e.g. "Curriculum") deep-link straight to a step. */
  initialStep?: BuilderStepKey;
}

export function CourseBuilderWizard({ courseId: routeCourseId, initialStep }: Readonly<CourseBuilderWizardProps>) {
  const navigate = useNavigate();
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const activeCourseId = routeCourseId ?? createdCourseId ?? undefined;

  const { data: course, isLoading, isError, error } = useMentorCourse(activeCourseId);
  const [activeStep, setActiveStep] = useState<BuilderStepKey>(initialStep ?? "basic");
  const [dirtyMap, setDirtyMap] = useState<Partial<Record<BuilderStepKey, boolean>>>({});

  const onDirtyChange = useCallback((stepKey: BuilderStepKey, dirty: boolean) => {
    setDirtyMap((prev) => (prev[stepKey] === dirty ? prev : { ...prev, [stepKey]: dirty }));
  }, []);

  const anyDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => anyDirty && currentLocation.pathname !== nextLocation.pathname,
    [anyDirty]
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const shouldLeave = window.confirm("You have unsaved changes that haven't finished saving yet. Leave anyway?");
    if (shouldLeave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!anyDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  const handleCreated = (newCourseId: string) => {
    setCreatedCourseId(newCourseId);
    setActiveStep("pricing");
    void navigate(`/mentor/courses/${newCourseId}/edit`, { replace: true });
  };

  // Create mode, before the draft exists: only Basic Info is reachable.
  if (!activeCourseId) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <BasicInfoStep course={null} onCreated={handleCreated} onDirtyChange={onDirtyChange} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Loading course…
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-sm">
        <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive-text">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Course not found</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error && /not found|no rows/i.test(error.message)
            ? "This course doesn't exist or you don't have permission to view it."
            : "You don't have permission to view this course, or it no longer exists."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Course builder steps" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="grid gap-1">
          {BUILDER_STEPS.map((step, index) => {
            const isActive = step.key === activeStep;
            const isDirty = !!dirtyMap[step.key];
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => setActiveStep(step.key)}
                  aria-current={isActive ? "step" : undefined}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "bg-secondary/10 text-secondary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate">{step.label}</span>
                  {isDirty && <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-500" aria-label="Unsaved changes" />}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* key={course.id}: remounts each step's local form state when the underlying
          course changes (e.g. right after Step 1 creates the draft), instead of an
          effect that re-syncs state - simpler and avoids a setState-in-effect. */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {activeStep === "basic" && <BasicInfoStep key={course.id} course={course} onCreated={handleCreated} onDirtyChange={onDirtyChange} />}
        {activeStep === "pricing" && <PricingStep key={course.id} course={course} onDirtyChange={onDirtyChange} />}
        {activeStep === "media" && <MediaStep key={course.id} course={course} onDirtyChange={onDirtyChange} />}
        {activeStep === "curriculum" && <CurriculumStep key={course.id} course={course} onDirtyChange={onDirtyChange} />}
        {activeStep === "outcomes" && <OutcomesStep key={course.id} course={course} onDirtyChange={onDirtyChange} />}
        {activeStep === "review" && <ReviewStep key={course.id} course={course} onDirtyChange={onDirtyChange} />}
      </div>
    </div>
  );
}
