import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Archive, BookOpen, Eye, FileEdit, ListTree, Loader2, Plus, SendHorizonal, Undo2 } from "lucide-react";
import { useArchiveMentorCourse, useCourseMediaUrl, useMentorCourses, useSubmitCourseForReview, useWithdrawCourseSubmission } from "@/hooks/useMentorPortal";
import { CourseNotCompleteError } from "@/services/courses.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge-variants";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { courseDetailRoute, mentorCourseCurriculumRoute, mentorCourseEditRoute } from "@/lib/routes";
import type { VariantProps } from "class-variance-authority";

type MentorCourseListItem = ReturnType<typeof useMentorCourses>["data"] extends (infer T)[] | undefined ? T : never;

const STATUS_BADGE: Record<string, { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }> = {
  draft: { label: "Draft", variant: "muted" },
  under_review: { label: "Under Review", variant: "warning" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "outline" },
};

function formatPrice(price: number | null) {
  if (!price) return "Free";
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function CourseThumbnail({ fileId }: Readonly<{ fileId: string | null }>) {
  const { data: url } = useCourseMediaUrl(fileId);
  if (!url) {
    return (
      <div className="grid size-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <BookOpen className="size-5" aria-hidden="true" />
      </div>
    );
  }
  return <img src={url} alt="" className="size-14 shrink-0 rounded-md border border-border object-cover" />;
}

function CourseRow({ course }: Readonly<{ course: MentorCourseListItem }>) {
  const submit = useSubmitCourseForReview(course.id);
  const withdraw = useWithdrawCourseSubmission(course.id);
  const archive = useArchiveMentorCourse();
  const [archiving, setArchiving] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);

  const status = STATUS_BADGE[course.status] ?? { label: course.status, variant: "muted" as const };

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync();
      toast.success(`"${course.title}" submitted for review.`);
      rowRef.current?.focus();
    } catch (error) {
      if (error instanceof CourseNotCompleteError) {
        toast.error("This course is missing required information. Open Edit to see what's needed.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to submit for review.");
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdraw.mutateAsync();
      toast.success(`"${course.title}" withdrawn back to draft.`);
      rowRef.current?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to withdraw submission.");
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(`Archive "${course.title}"? It will be unpublished and hidden from students.`)) return;
    setArchiving(true);
    try {
      await archive.mutateAsync(course.id);
      toast.success(`"${course.title}" archived.`);
      rowRef.current?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive course.");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <li
      ref={rowRef}
      tabIndex={-1}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CourseThumbnail fileId={course.thumbnail_file_id} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{course.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {course.categoryNames.length > 0 ? course.categoryNames.join(", ") : "Uncategorized"} · Updated {formatDate(course.updated_at)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-4 text-sm">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-muted-foreground">{formatPrice(course.price)}</span>
        <span className="text-muted-foreground">
          {course.enrollmentCount} {course.enrollmentCount === 1 ? "student" : "students"}
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to={mentorCourseEditRoute(course.id)} aria-label={`Edit "${course.title}"`}>
            <FileEdit className="size-3.5" aria-hidden="true" />
            Edit
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to={mentorCourseCurriculumRoute(course.id)} aria-label={`Curriculum for "${course.title}"`}>
            <ListTree className="size-3.5" aria-hidden="true" />
            Curriculum
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link
            to={courseDetailRoute(course.slug)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Preview "${course.title}" (opens in new tab)`}
          >
            <Eye className="size-3.5" aria-hidden="true" />
            Preview
          </Link>
        </Button>

        {course.status === "draft" && (
          <Button size="sm" onClick={() => void handleSubmit()} disabled={submit.isPending} aria-busy={submit.isPending} className="gap-1.5">
            {submit.isPending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <SendHorizonal className="size-3.5" aria-hidden="true" />}
            Submit for Review
          </Button>
        )}
        {course.status === "under_review" && (
          <Button variant="outline" size="sm" onClick={() => void handleWithdraw()} disabled={withdraw.isPending} aria-busy={withdraw.isPending} className="gap-1.5">
            {withdraw.isPending ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Undo2 className="size-3.5" aria-hidden="true" />}
            Withdraw
          </Button>
        )}
        {(course.status === "draft" || course.status === "published" || course.status === "under_review") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleArchive()}
            disabled={archiving}
            aria-busy={archiving}
            className="gap-1.5 text-destructive-text hover:text-destructive-text"
          >
            {archiving ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Archive className="size-3.5" aria-hidden="true" />}
            Archive
          </Button>
        )}
      </div>
    </li>
  );
}

export function CoursesTab() {
  const { data: courses, isLoading } = useMentorCourses();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const list = courses ?? [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="size-8" aria-hidden="true" />}
        title="No courses yet"
        description="Create your first course to start building your catalogue."
        primaryAction={
          <Button asChild className="gap-2">
            <Link to="/mentor/courses/new">
              <Plus className="size-4" aria-hidden="true" />
              Create Course
            </Link>
          </Button>
        }
      />
    );
  }

  const metrics = [
    { label: "Total Courses", value: list.length },
    { label: "Drafts", value: list.filter((c) => c.status === "draft").length },
    { label: "Under Review", value: list.filter((c) => c.status === "under_review").length },
    { label: "Published", value: list.filter((c) => c.status === "published").length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">Assigned Courses</h2>
          <p className="text-sm text-muted-foreground">Manage the courses you own.</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/mentor/courses/new">
            <Plus className="size-4" aria-hidden="true" />
            Create Course
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-black text-foreground">{m.value}</p>
            <p className="text-xs font-semibold text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <ul className="space-y-3">
        {list.map((course) => (
          <CourseRow key={course.id} course={course} />
        ))}
      </ul>
    </div>
  );
}
