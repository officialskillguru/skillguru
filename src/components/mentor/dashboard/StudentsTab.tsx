import { CheckCircle, PlayCircle } from "lucide-react";
import { useMentorStudents } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function StudentsTab() {
  const { data: enrollments, isLoading } = useMentorStudents();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-foreground text-2xl font-black">Your Students</h1>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  if (!enrollments || enrollments.length === 0)
    return (
      <div className="space-y-4">
        <h1 className="text-foreground text-2xl font-black">Your Students</h1>
        <div className="text-muted-foreground py-12 text-center text-sm font-semibold">
          No active students.
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-black">Your Students</h1>
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-border border-b">
              <tr>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-4 text-xs font-black uppercase"
                >
                  Student Name
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-4 text-xs font-black uppercase"
                >
                  Course
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-4 text-xs font-black uppercase"
                >
                  Enrollment Status
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-6 py-4 text-xs font-black uppercase"
                >
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {enrollments.map(
                (enr: {
                  id: string;
                  profile?: { full_name?: string };
                  courses?: { title?: string };
                  status: string;
                  completionPercentage?: number;
                }) => (
                  <tr key={enr.id}>
                    <td className="text-foreground px-6 py-4 font-bold">
                      {enr.profile?.full_name || "Unknown Student"}
                    </td>
                    <td className="text-muted-foreground px-6 py-4 text-sm font-medium">
                      {enr.courses?.title || "Unknown Course"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={enr.status === "completed" ? "success" : "info"}
                        className="gap-1.5 capitalize"
                      >
                        {enr.status === "completed" ? (
                          <CheckCircle className="size-3" aria-hidden="true" />
                        ) : (
                          <PlayCircle className="size-3" aria-hidden="true" />
                        )}
                        {enr.status}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-6 py-4 text-sm font-medium">
                      {enr.completionPercentage ?? 0}%
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
