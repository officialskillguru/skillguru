import { BookOpen, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useStudentCourses } from "@/hooks/student/useStudentCourses";
import { resolveFileUrl } from "@/services/storage.service";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";

export default function MyCoursesPage() {
  const { data: coursesData, isLoading, error } = useStudentCourses(1, 10);

  if (error) {
    return <ErrorState title="Failed to load courses" message={error.message} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-foreground">My Courses</h2>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : coursesData?.data && coursesData.data.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coursesData.data.map((enrollment) =>
              enrollment.courses ? (
                <div key={enrollment.id} className="group relative rounded-2xl border border-border p-5 transition-shadow hover:shadow-md">
                  <CourseThumbnail fileId={enrollment.courses.thumbnailFileId ?? null} title={enrollment.courses.title ?? ""} />
                  <h3 className="mb-1 truncate font-bold text-foreground">{enrollment.courses.title}</h3>

                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{enrollment.status}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        role="progressbar"
                        aria-valuenow={enrollment.progressPercentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${enrollment.courses.title ?? "Course"} progress`}
                        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                      >
                        <div className="h-full rounded-full bg-secondary" style={{ width: `${enrollment.progressPercentage}%` }} />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{enrollment.progressPercentage}%</span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border pt-4">
                    <Link
                      to={`/dashboard/courses/${enrollment.courses.id}`}
                      className="block w-full rounded-xl bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Go to Course
                    </Link>
                  </div>
                </div>
              ) : (
                // The joined course row can be legitimately absent here: courses RLS only
                // exposes published courses to students, so an enrollment created while a
                // course was published still exists (and still counts toward "Enrolled")
                // after the course is later moved back to draft/archived. Show an honest
                // "unavailable" state instead of a card with a blank title and a dead link
                // to `/dashboard/courses/undefined`.
                <div key={enrollment.id} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-5 text-center">
                  <EyeOff className="size-8 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-bold text-foreground">This course is currently unavailable.</p>
                  <p className="text-xs text-muted-foreground">Your enrollment is safe — check back later or contact support.</p>
                </div>
              )
            )}
          </div>
        ) : (
          <EmptyState
            title="No courses yet"
            message="You haven't enrolled in any courses. Check out our catalog to start learning."
            icon={<BookOpen className="size-10" aria-hidden="true" />}
            action={
              <Link to="/courses" className="rounded-xl bg-secondary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-secondary/90">
                Browse Catalog
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

function CourseThumbnail({ fileId, title }: { fileId: string | null; title: string }) {
  const { data: url } = useQuery({
    queryKey: ["file-url", fileId],
    queryFn: () => resolveFileUrl(fileId ?? ""),
    enabled: !!fileId,
  });

  return (
    <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-muted">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground" aria-label={title}>
          <BookOpen className="size-10" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
