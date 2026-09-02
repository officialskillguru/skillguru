import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge-variants";
import type { VariantProps } from "class-variance-authority";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface CourseListRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  instructorCount: number;
}

const STATUS_BADGE: Record<string, { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }> = {
  draft: { label: "Draft", variant: "muted" },
  under_review: { label: "Under Review", variant: "warning" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "outline" },
};

async function fetchCourses(): Promise<CourseListRow[]> {
  const supabase = getSupabaseClientOrThrow();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, slug, status")
    .is("deleted_at", null)
    .order("title");
  if (error) throw error;

  const ids = (courses ?? []).map((c) => c.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: assignments } = await supabase
      .from("course_mentors")
      .select("course_id")
      .in("course_id", ids)
      .eq("status", "active");
    for (const a of assignments ?? []) {
      counts.set(a.course_id, (counts.get(a.course_id) ?? 0) + 1);
    }
  }

  return (courses ?? []).map((c) => ({ ...c, instructorCount: counts.get(c.id) ?? 0 }));
}

export default function CounsellorCoursesPage() {
  usePageMeta("Courses");
  const { data: courses, isLoading } = useQuery({ queryKey: ["counsellor-courses"], queryFn: fetchCourses });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Review course status and instructor coverage. Manage which mentors teach a course from{" "}
            <Link to="/counsellor/mentors" className="font-semibold text-primary hover:underline">Mentor Management</Link>.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : !courses || courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-8" aria-hidden="true" />} title="No courses yet" description="Courses created by Admin will appear here." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Course</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Instructors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => {
                const status = STATUS_BADGE[c.status] ?? { label: c.status, variant: "muted" as const };
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-semibold text-foreground">{c.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant} className="capitalize">{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.instructorCount === 0 ? (
                        <span className="font-semibold text-destructive-text">No instructor assigned</span>
                      ) : (
                        `${c.instructorCount} instructor${c.instructorCount === 1 ? "" : "s"}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
