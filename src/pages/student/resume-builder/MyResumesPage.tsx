// "My Resumes" — Resume Builder dashboard. Every number and card comes from
// the student's own rows (RLS-bound queries); nothing is hard-coded.
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyResumes, useMyResumeStats } from "@/hooks/student/useResumes";
import { ResumeCard, ResumeStatsCards } from "@/features/resume-builder/components/dashboard";
import { TemplateGalleryDialog } from "@/features/resume-builder/components/TemplateGalleryDialog";

export default function MyResumesPage() {
  const [page, setPage] = useState(1);
  const stats = useMyResumeStats();
  const list = useMyResumes(page);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const resumes = list.data?.data ?? [];
  const latestDraft = resumes.find((r) => r.status === "draft");
  const total = stats.data?.totalCount ?? list.data?.count ?? 0;

  const changePage = (next: number) => {
    setPage(next);
    requestAnimationFrame(() => listHeadingRef.current?.focus());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">My Resumes</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">Create, improve, and manage professional ATS-friendly resumes with AI.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TemplateGalleryDialog />
          {latestDraft && (
            <Button asChild variant="outline">
              <Link to={`/dashboard/resume-builder/${latestDraft.id}/edit`} aria-label={`Continue draft: ${latestDraft.title}`}>
                <Pencil className="size-4" aria-hidden="true" /> Continue draft
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link to="/dashboard/resume-builder/new">
              <FilePlus2 className="size-4" aria-hidden="true" /> Create New Resume
            </Link>
          </Button>
        </div>
      </div>

      {stats.isError ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive-text">
          Resume statistics could not be loaded.{" "}
          <button type="button" className="font-bold underline" onClick={() => void stats.refetch()}>
            Try again
          </button>
        </p>
      ) : (
        <ResumeStatsCards stats={stats.data} loading={stats.isLoading} />
      )}

      <section aria-labelledby="my-resumes-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="my-resumes-heading" ref={listHeadingRef} tabIndex={-1} className="text-lg font-black text-foreground outline-none">
            Saved resumes
          </h2>
          <Link to="/dashboard/resume-builder/classic" className="text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Open the classic profile resume
          </Link>
        </div>

        {list.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status">
            <span className="sr-only">Loading your resumes…</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : list.isError ? (
          <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-bold text-destructive-text">Your resumes could not be loaded.</p>
            <Button className="mt-2" size="sm" variant="outline" onClick={() => void list.refetch()}>
              Try again
            </Button>
          </div>
        ) : resumes.length === 0 && page === 1 ? (
          <EmptyState
            headingLevel={3}
            icon={<FileText className="size-9" aria-hidden="true" />}
            title="Your professional journey starts here."
            description="Create your first ATS-friendly resume with Skill Guru's AI-powered Resume Builder."
            primaryAction={
              <Button asChild>
                <Link to="/dashboard/resume-builder/new">Create My First Resume</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resumes.map((resume) => (
                <ResumeCard key={resume.id} resume={resume} onDeleted={() => requestAnimationFrame(() => listHeadingRef.current?.focus())} />
              ))}
            </ul>
            {(list.data?.totalPages ?? 1) > 1 && (
              <nav aria-label="Resume pages" className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                  Previous page
                </Button>
                <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
                  Page {page} of {list.data?.totalPages} ({total} resumes)
                </p>
                <Button variant="outline" size="sm" disabled={page >= (list.data?.totalPages ?? 1)} onClick={() => changePage(page + 1)}>
                  Next page
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
