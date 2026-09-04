import { useNavigate } from "react-router-dom";
import { Radio, Video } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useStudentLiveClasses } from "@/hooks/useLiveClasses";
import type { LiveClass, LiveClassBucket } from "@/services/live-classes.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const BUCKET_LABELS: Record<LiveClassBucket, string> = {
  today: "Today",
  upcoming: "Upcoming",
  past: "Past",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "destructive"> = {
  scheduled: "warning",
  live: "success",
  completed: "muted",
  cancelled: "destructive",
};

function ClassCard({ cls, onJoin }: Readonly<{ cls: LiveClass; onJoin: (id: string) => void }>) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-foreground">{cls.title}</p>
            <Badge variant="warning" className="shrink-0">Demo</Badge>
          </div>
          <p className="truncate text-xs font-semibold text-muted-foreground">{cls.courseTitle} · {cls.mentorName}</p>
        </div>
        <Badge variant={STATUS_VARIANT[cls.status] ?? "muted"} className="shrink-0 capitalize">{cls.status}</Badge>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        {new Date(cls.scheduled_date).toLocaleDateString()} · {cls.start_time.slice(0, 5)}–{cls.end_time.slice(0, 5)}
      </p>
      {cls.description && <p className="mt-1 line-clamp-2 text-xs text-foreground/80">{cls.description}</p>}
      <Button
        type="button"
        size="sm"
        className="mt-3 gap-1.5"
        disabled={cls.status === "cancelled" || cls.status === "completed"}
        onClick={() => onJoin(cls.id)}
      >
        <Video className="size-3.5" aria-hidden="true" /> Join Demo
      </Button>
    </div>
  );
}

export default function StudentLiveClassesPage() {
  usePageMeta("Live Classes");
  const navigate = useNavigate();
  const { grouped, isLoading, isError, refetch } = useStudentLiveClasses();

  const buckets: LiveClassBucket[] = ["today", "upcoming", "past"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-foreground">
          <Radio className="size-6 text-primary" aria-hidden="true" /> Live Classes
          <Badge variant="warning">Demo / Coming Soon</Badge>
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Live sessions for your enrolled courses. This is a demo experience — no real video provider is connected yet.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Failed to load live classes.
          <button type="button" onClick={() => void refetch()} className="ml-2 font-black underline">Retry</button>
        </div>
      ) : (
        buckets.map((bucket) => {
          const items = grouped?.[bucket] ?? [];
          return (
            <section key={bucket} aria-label={BUCKET_LABELS[bucket]}>
              <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-muted-foreground">{BUCKET_LABELS[bucket]}</h2>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs font-semibold text-muted-foreground">
                  No classes {bucket === "past" ? "yet" : bucket}.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((cls) => (
                    <ClassCard key={cls.id} cls={cls} onJoin={(id) => void navigate(`/dashboard/live-classes/${id}/room`)} />
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
