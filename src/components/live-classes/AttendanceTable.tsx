import { format } from "date-fns";
import { useLiveClassRoster } from "@/hooks/useLiveClasses";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/** Enrolled students for a class with their recorded attendance (teacher / counsellor views). */
export function AttendanceTable({ classId, poll = false }: Readonly<{ classId: string; poll?: boolean }>) {
  const { data: roster, isLoading, isError, error } = useLiveClassRoster(classId, { poll });

  if (isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (isError) return <p role="alert" className="text-sm font-semibold text-destructive-text">{error instanceof Error ? error.message : "Roster unavailable."}</p>;
  if (!roster || roster.length === 0) return <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No students are enrolled in this course yet.</p>;

  const present = roster.filter((r) => r.attendanceStatus === "present").length;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] text-left text-sm">
        <caption className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{present} of {roster.length} enrolled students joined</caption>
        <thead className="bg-muted/50 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2">Student</th>
            <th scope="col" className="px-4 py-2">Attendance</th>
            <th scope="col" className="px-4 py-2">Joined at</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {roster.map((r) => (
            <tr key={r.studentId}>
              <td className="px-4 py-2">
                <p className="font-semibold text-foreground">{r.fullName ?? "Student"}</p>
                <p className="text-xs text-muted-foreground">{r.email}</p>
              </td>
              <td className="px-4 py-2">
                <Badge variant={r.attendanceStatus === "present" ? "success" : "muted"}>{r.attendanceStatus === "present" ? "Present" : "Not joined"}</Badge>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{r.joinedAt ? format(new Date(r.joinedAt), "h:mm a") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
