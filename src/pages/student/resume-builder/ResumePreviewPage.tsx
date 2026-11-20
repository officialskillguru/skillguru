// Shows the ACTUAL generated PDF (short-lived signed URL from private
// storage) — never an HTML imitation. Without a generated PDF it says so.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, LayoutTemplate, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useResumeDetail } from "@/hooks/student/useResumes";
import { getResumePdfUrl } from "@/services/resumes.service";
import { PdfPanel } from "@/features/resume-builder/components/review-tools";
import { downloadResumePdf } from "@/features/resume-builder/pdf-actions";
import { templateDisplayName } from "@/features/resume-builder/domain/templates";

export default function ResumePreviewPage() {
  const { resumeId } = useParams();
  const resume = useResumeDetail(resumeId);
  const [reloadKey, setReloadKey] = useState(0);
  const path = resume.data?.latest_pdf_path ?? null;
  const pdfUrl = useQuery({
    queryKey: ["resume-pdf-url", path, reloadKey],
    queryFn: () => getResumePdfUrl(path!),
    enabled: !!path,
    staleTime: 4 * 60 * 1000, // signed URLs live 5 minutes
  });

  if (resume.isLoading) return <Skeleton className="h-[70vh] w-full rounded-2xl" />;
  if (!resume.data) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-black">Resume not found</h1>
        <Button asChild variant="outline">
          <Link to="/dashboard/resume-builder">Back to My Resumes</Link>
        </Button>
      </div>
    );
  }
  const r = resume.data;
  const outdated = !!path && (r.latest_generated_revision ?? 0) < r.revision;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/dashboard/resume-builder" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> My Resumes
        </Link>
        <h1 className="text-2xl font-black text-foreground">{r.title}</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <dl className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
            <div>
              <dt className="text-xs font-bold text-muted-foreground">Target role</dt>
              <dd className="font-semibold">{r.target_role || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted-foreground">Template</dt>
              <dd className="font-semibold">{templateDisplayName(r.template_id)}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted-foreground">PDF generated</dt>
              <dd className="font-semibold">{r.latest_generated_at ? new Date(r.latest_generated_at).toLocaleString() : "Not yet"}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            {path && (
              <Button onClick={() => void downloadResumePdf(path, r.resume_data.personal.fullName, r.target_role)}>
                <Download className="size-4" aria-hidden="true" /> Download {r.title} PDF
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to={`/dashboard/resume-builder/${r.id}/edit`}>
                <Pencil className="size-4" aria-hidden="true" /> Edit resume
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/dashboard/resume-builder/${r.id}/edit?step=0`}>
                <LayoutTemplate className="size-4" aria-hidden="true" /> Change template
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/dashboard/resume-builder/${r.id}/edit?step=9`}>
                <FileText className="size-4" aria-hidden="true" /> Improve with AI
              </Link>
            </Button>
          </div>
          <PdfPanel resume={r} data={r.resume_data} beforeGenerate={() => Promise.resolve(true)} />
        </aside>

        <section aria-label="PDF preview" className="min-w-0">
          {!path ? (
            <EmptyState
              headingLevel={2}
              icon={<FileText className="size-9" aria-hidden="true" />}
              title="No PDF generated yet"
              description="Generate your resume PDF to preview it here. The preview shows the exact file you will download."
            />
          ) : pdfUrl.isError ? (
            <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-bold text-destructive-text">The PDF preview could not be loaded.</p>
              <Button className="mt-2" size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                <RefreshCw className="size-4" aria-hidden="true" /> Try again
              </Button>
            </div>
          ) : !pdfUrl.data ? (
            <Skeleton className="h-[75vh] w-full rounded-2xl" />
          ) : (
            <div className="space-y-2">
              {outdated && <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">This PDF is older than your latest edits. Generate an updated PDF to include them.</p>}
              <iframe title={`Resume PDF preview: ${r.title}`} src={pdfUrl.data} className="h-[75vh] w-full rounded-2xl border border-border bg-white" />
              <p className="text-xs text-muted-foreground">
                If the preview doesn't display on your device,{" "}
                <a href={pdfUrl.data} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  open the PDF in a new tab
                </a>{" "}
                or use Download.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
