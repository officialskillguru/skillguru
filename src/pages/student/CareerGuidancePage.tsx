import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Compass, Loader2, Sparkles, ArrowRight, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/badge";
import { useCareerGuidanceReports, useGenerateCareerGuidance, useRecommendedCourses } from "@/hooks/student/useCareerGuidance";
import type { CareerGuidanceReport } from "@/services/career-guidance.service";

const PRIORITY_VARIANTS: Record<string, "destructive" | "warning" | "muted"> = { high: "destructive", medium: "warning", low: "muted" };

export default function CareerGuidancePage() {
  const [targetRole, setTargetRole] = useState("");
  const { data: reports, isLoading, error } = useCareerGuidanceReports();
  const generate = useGenerateCareerGuidance();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const latestReport = reports?.[0];
  const selectedReport = reports?.find((r) => r.id === selectedReportId) ?? latestReport;

  const handleGenerate = () => {
    if (!targetRole.trim()) {
      toast.error("Enter a target role, e.g. \"Frontend Developer\".");
      return;
    }
    generate.mutate(targetRole.trim(), {
      onSuccess: (report) => {
        toast.success("Career guidance generated.");
        setSelectedReportId(report.id);
        setTargetRole("");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to generate guidance."),
    });
  };

  if (error) return <ErrorState title="Failed to load career guidance" message={error.message} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-foreground">AI Career Guidance</h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Get an honest, AI-generated assessment of your readiness for a target role, grounded in your real resume and courses.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="target-role" className="sr-only">Target role</label>
          <input
            id="target-role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Frontend Developer, Data Analyst, Product Manager..."
            className="h-11 flex-1 rounded-xl border border-border bg-muted px-4 text-sm outline-none focus:border-primary focus:bg-card"
          />
          <button
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {generate.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            Generate Guidance
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Add your experience, projects, and skills in the{" "}
          <Link to="/dashboard/resume-builder" className="font-bold text-primary hover:underline">Resume Builder</Link> first for a more personalized result.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : !reports || reports.length === 0 ? (
        <EmptyState
          title="No guidance generated yet"
          message="Enter a target role above and generate your first AI career guidance report."
          icon={<Compass className="size-10" aria-hidden="true" />}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {selectedReport && <ReportView report={selectedReport} />}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
              <History className="size-3.5" aria-hidden="true" /> History
            </h3>
            <div className="mt-3 space-y-2">
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  aria-current={(selectedReport?.id ?? latestReport?.id) === r.id ? "true" : undefined}
                  className={`w-full rounded-lg border p-2.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    (selectedReport?.id ?? latestReport?.id) === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <p className="font-bold text-foreground">{r.target_role}</p>
                  <p className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportView({ report }: { report: CareerGuidanceReport }) {
  const { data: courses } = useRecommendedCourses(report.recommended_course_ids);
  const skillGaps = (report.skill_gaps as { skill: string; why: string; priority: string }[]) ?? [];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-black text-foreground">{report.target_role}</h3>
        <p className="text-xs text-muted-foreground">Generated {new Date(report.created_at).toLocaleString()}</p>
      </div>

      <p className="text-sm leading-6 text-foreground/80">{report.summary}</p>

      {skillGaps.length > 0 && (
        <div>
          <h4 className="text-xs font-black uppercase tracking-wide text-muted-foreground">Skill Gaps</h4>
          <div className="mt-2 space-y-2">
            {skillGaps.map((gap, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground">{gap.skill}</p>
                  <Badge variant={PRIORITY_VARIANTS[gap.priority] ?? "muted"} className="capitalize">{gap.priority}</Badge>
                </div>
                <p className="mt-1 text-sm text-foreground/80">{gap.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.action_items.length > 0 && (
        <div>
          <h4 className="text-xs font-black uppercase tracking-wide text-muted-foreground">Action Items</h4>
          <ul className="mt-2 space-y-1.5">
            {report.action_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {courses && courses.length > 0 && (
        <div>
          <h4 className="text-xs font-black uppercase tracking-wide text-muted-foreground">Recommended Courses</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.slug}`}
                className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {c.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
