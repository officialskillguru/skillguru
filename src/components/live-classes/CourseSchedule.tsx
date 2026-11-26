import { CalendarClock } from "lucide-react";
import type { PublicSession } from "@/services/live-classes.service";
import { useCourseSchedule } from "@/hooks/useLiveClasses";
import { formatIstSession } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "muted" }> = {
  scheduled: { label: "Scheduled", variant: "warning" },
  live: { label: "Live now", variant: "success" },
  completed: { label: "Completed", variant: "muted" },
};

export function ScheduleList({ sessions, compact = false }: Readonly<{ sessions: PublicSession[]; compact?: boolean }>) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {sessions.map((s) => {
        const status = STATUS[s.status] ?? { label: s.status, variant: "muted" as const };
        return (
          <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{s.title}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {formatIstSession(s.scheduledDate, s.startTime, s.endTime)}
                {!compact && s.mentorName ? ` · ${s.mentorName}` : ""}
              </p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}

/** Live class schedule for a published course, or a clear "to be announced" state. */
export function CourseSchedule({ courseId }: Readonly<{ courseId: string }>) {
  const { data: sessions, isLoading, isError } = useCourseSchedule(courseId);

  return (
    <div className="mt-8">
      <h3 className="flex items-center gap-2 text-lg font-black text-primary">
        <CalendarClock className="size-4.5 text-secondary" aria-hidden="true" />
        Live Class Schedule
      </h3>
      <div className="mt-4">
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : isError ? (
          <p role="alert" className="text-sm text-muted-foreground">The class schedule could not be loaded right now.</p>
        ) : !sessions || sessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Class schedule to be announced. Enrolled students are notified as soon as the first live class is scheduled.
          </p>
        ) : (
          <ScheduleList sessions={sessions} />
        )}
      </div>
    </div>
  );
}
