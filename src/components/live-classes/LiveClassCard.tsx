import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import type { LiveClass } from "@/services/live-classes.service";
import { formatIstTime, relativeIstDay } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { LIVE_CLASS_STATUS } from "./live-class-status";

/** One class session: title, course, teacher, IST time, status, and role-specific actions. */
export function LiveClassCard({
  cls,
  showTeacher = true,
  note,
  children,
}: Readonly<{ cls: LiveClass; showTeacher?: boolean; note?: ReactNode; children?: ReactNode }>) {
  const status = LIVE_CLASS_STATUS[cls.status] ?? { label: cls.status, variant: "muted" as const };
  return (
    <article
      aria-labelledby={`live-class-${cls.id}-title`}
      className={["rounded-xl border bg-card p-4 shadow-sm", cls.status === "live" ? "border-success ring-1 ring-success/40" : "border-border"].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`live-class-${cls.id}-title`} className="font-bold text-foreground">{cls.title}</h3>
          <p className="text-xs font-semibold text-muted-foreground">
            {cls.courseTitle}
            {showTeacher && cls.mentorName ? ` · ${cls.mentorName}` : ""}
          </p>
        </div>
        <Badge variant={status.variant} className="shrink-0">
          {cls.status === "live" && <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" aria-hidden="true" />}
          {status.label}
        </Badge>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        {relativeIstDay(cls.scheduled_date)} · {formatIstTime(cls.start_time)} – {formatIstTime(cls.end_time)} IST
      </p>
      {cls.description && <p className="mt-1 line-clamp-2 text-xs text-foreground/80">{cls.description}</p>}
      {note && <div className="mt-2 text-xs font-semibold text-muted-foreground">{note}</div>}
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </article>
  );
}
