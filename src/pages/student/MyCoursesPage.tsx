import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useStudentCourses } from "@/hooks/student/useStudentCourses";
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
            {coursesData.data.map((enrollment) => (
              <div key={enrollment.id} className="group relative rounded-2xl border border-slate-200 p-5 transition-shadow hover:shadow-md">
                <div className="mb-4 aspect-video rounded-xl bg-slate-100 overflow-hidden">
                  {enrollment.courses?.thumbnailFileId ? (
                    <img 
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/course-assets/${enrollment.courses.thumbnailFileId}`} alt={String(enrollment.courses.title)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                      <BookOpen className="size-10" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-foreground mb-1 truncate">{enrollment.courses?.title}</h3>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black">{enrollment.status}</p>
                  </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `0%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500">0%</span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Link
                    to={`/dashboard/courses/${enrollment.courses?.id}`}
                    className="block w-full rounded-xl bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Go to Course
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No courses yet"
            message="You haven't enrolled in any courses. Check out our catalog to start learning."
            icon={<BookOpen className="size-10" />}
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
