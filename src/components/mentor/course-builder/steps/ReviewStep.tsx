import { useRef } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCourseCompleteness, useSubmitCourseForReview, useWithdrawCourseSubmission } from "@/hooks/useMentorPortal";
import { CourseNotCompleteError } from "@/services/courses.service";
import type { StepProps } from "@/components/mentor/course-builder/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  under_review: "Under Review",
  published: "Published",
  archived: "Archived",
};

export function ReviewStep({ course }: Readonly<StepProps>) {
  const { data: completeness, isLoading } = useCourseCompleteness(course.id);
  const submit = useSubmitCourseForReview(course.id);
  const withdraw = useWithdrawCourseSubmission(course.id);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync();
      toast.success("Submitted for review. An admin will approve or request changes.");
      containerRef.current?.focus();
    } catch (error) {
      if (error instanceof CourseNotCompleteError) {
        toast.error("This course is missing required information — see the checklist below.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to submit for review.");
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdraw.mutateAsync();
      toast.success("Submission withdrawn — the course is back in Draft.");
      containerRef.current?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to withdraw submission.");
    }
  };

  return (
    <div ref={containerRef} tabIndex={-1} className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div>
        <h2 className="text-lg font-bold text-foreground">Review & Submit</h2>
        <p className="text-sm text-muted-foreground">Confirm everything is ready before sending this course for admin review.</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Current status</p>
          <p className="text-lg font-bold text-foreground">{STATUS_LABEL[course.status] ?? course.status}</p>
        </div>
        {completeness && (
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Readiness</p>
            <p className="text-lg font-bold text-foreground">{completeness.percent}%</p>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <p className="text-sm font-bold text-foreground">Submission checklist</p>
        {isLoading || !completeness ? (
          <p className="text-xs text-muted-foreground">Checking course completeness…</p>
        ) : (
          <ul className="space-y-1.5">
            {completeness.checks.map((check) => (
              <li key={check.key} className="flex items-center gap-2 text-sm">
                {check.met ? (
                  <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <X className="size-4 shrink-0 text-destructive-text" aria-hidden="true" />
                )}
                <span className={check.met ? "text-foreground" : "font-semibold text-destructive-text"}>{check.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {course.status === "draft" && (
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          {completeness && !completeness.isComplete && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              Complete the checklist above to submit.
            </p>
          )}
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!completeness?.isComplete || submit.isPending}
            aria-busy={submit.isPending}
            className="ml-auto gap-2"
          >
            {submit.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              "Submit for Review"
            )}
          </Button>
        </div>
      )}

      {course.status === "under_review" && (
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <Badge variant="warning">Awaiting admin review</Badge>
          <Button type="button" variant="outline" onClick={() => void handleWithdraw()} disabled={withdraw.isPending} aria-busy={withdraw.isPending}>
            {withdraw.isPending ? "Withdrawing…" : "Withdraw & Edit"}
          </Button>
        </div>
      )}

      {course.status === "archived" && (
        <div className="border-t border-border pt-4">
          <Badge variant="muted">This course is archived</Badge>
        </div>
      )}
    </div>
  );
}
