import { Link, useNavigate } from "react-router-dom";
import { Radio, Video } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useStudentLiveClasses } from "@/hooks/useLiveClasses";
import type { LiveClass, LiveClassBucket } from "@/services/live-classes.service";
import { LiveClassCard } from "@/components/live-classes/LiveClassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/routes";

const BUCKET_LABELS: Record<LiveClassBucket, string> = {
  today: "Today",
  upcoming: "Upcoming",
  past: "Past",
};

function StudentClassActions({ cls, onJoin }: Readonly<{ cls: LiveClass; onJoin: (id: string) => void }>) {
  if (cls.status === "live") {
    return (
      <Button type="button" size="sm" className="gap-1.5" onClick={() => onJoin(cls.id)}>
        <Video className="size-3.5" aria-hidden="true" /> Join class
      </Button>
    );
  }
  return null;
}

function studentNote(cls: LiveClass) {
  switch (cls.status) {
    case "scheduled":
      return "Waiting for the teacher to start. Join opens here as soon as the class goes live.";
    case "completed":
      return "This class has ended.";
    case "cancelled":
      return "This class was cancelled by the course team.";
    default:
      return null;
  }
}

export default function StudentLiveClassesPage() {
  usePageMeta("Live Classes");
  const navigate = useNavigate();
  const { grouped, data, isLoading, isError, refetch } = useStudentLiveClasses();
  const buckets: LiveClassBucket[] = ["today", "upcoming", "past"];
  const liveCount = (data ?? []).filter((c) => c.status === "live").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black text-foreground">
          <Radio className="size-6 text-primary" aria-hidden="true" /> Class Schedule
          <Badge variant="info">Simulated classroom</Badge>
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Live sessions for your enrolled courses. All times are India Standard Time (IST). This page refreshes automatically.
        </p>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {liveCount > 0 ? `${liveCount} class${liveCount === 1 ? " is" : "es are"} live now.` : ""}
      </p>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm font-semibold text-destructive-text">
          Failed to load your class schedule.
          <button type="button" onClick={() => void refetch()} className="ml-2 font-black underline">Retry</button>
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No live classes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Classes for courses you enroll in appear here, and you are notified when one is scheduled.</p>
          <Link to={routes.courses} className="mt-4 inline-block text-sm font-bold text-primary underline">Explore courses</Link>
        </div>
      ) : (
        buckets.map((bucket) => {
          const items = grouped?.[bucket] ?? [];
          return (
            <section key={bucket} aria-labelledby={`bucket-${bucket}`}>
              <h2 id={`bucket-${bucket}`} className="mb-3 text-sm font-black uppercase tracking-wider text-muted-foreground">{BUCKET_LABELS[bucket]}</h2>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs font-semibold text-muted-foreground">
                  No classes {bucket === "past" ? "yet" : bucket}.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((cls) => (
                    <LiveClassCard key={cls.id} cls={cls} note={studentNote(cls)}>
                      <StudentClassActions cls={cls} onJoin={(id) => void navigate(`/dashboard/live-classes/${id}/room`)} />
                    </LiveClassCard>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
