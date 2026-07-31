import { Link } from "react-router-dom";
import { Video } from "lucide-react";
import { useMentorCourses } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { courseDetailRoute } from "@/lib/routes";

export function CoursesTab() {
  const { data: courses, isLoading } = useMentorCourses();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!courses || courses.length === 0) return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">No courses assigned to you yet.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Assigned Courses</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((course) => (
          <article key={course.id} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-foreground">{course.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{course.description ?? ""}</p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <Badge variant={course.status === "published" ? "success" : "warning"} className="capitalize">
                {course.status}
              </Badge>
              {course.status === "published" ? (
                <Link
                  to={courseDetailRoute(course.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Video className="size-4" aria-hidden="true" />
                  View Live Page
                </Link>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">Not published yet</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
