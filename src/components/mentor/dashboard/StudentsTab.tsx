import { CheckCircle, PlayCircle } from "lucide-react";
import { useMentorStudents } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function StudentsTab() {
  const { data: enrollments, isLoading } = useMentorStudents();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (!enrollments || enrollments.length === 0) return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">No active students.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Your Students</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Student Name</th>
                <th scope="col" className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Course</th>
                <th scope="col" className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Enrollment Status</th>
                <th scope="col" className="px-6 py-4 text-xs font-black uppercase text-muted-foreground">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrollments.map((enr: { id: string; profile?: { full_name?: string }; courses?: { title?: string }; status: string; completionPercentage?: number }) => (
                <tr key={enr.id}>
                  <td className="px-6 py-4 font-bold text-foreground">
                    {enr.profile?.full_name || "Unknown Student"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                    {enr.courses?.title || "Unknown Course"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={enr.status === "completed" ? "success" : "info"} className="gap-1.5 capitalize">
                      {enr.status === "completed" ? <CheckCircle className="size-3" aria-hidden="true" /> : <PlayCircle className="size-3" aria-hidden="true" />}
                      {enr.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                    {enr.completionPercentage ?? 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
