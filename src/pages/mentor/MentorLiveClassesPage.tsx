import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Radio, Video } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useMentorProfileId } from "@/hooks/useMentorPortal";
import { useMentorLiveClasses, useLiveClassMutations } from "@/hooks/useLiveClasses";
import { listMentorCourses } from "@/services/mentors.service";
import type { LiveClass, LiveClassBucket } from "@/services/live-classes.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const BUCKET_LABELS: Record<LiveClassBucket, string> = {
  today: "Today's Classes",
  upcoming: "Upcoming Live Classes",
  past: "Previous Classes",
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
          <p className="truncate text-xs font-semibold text-muted-foreground">{cls.courseTitle}</p>
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
        <Video className="size-3.5" aria-hidden="true" /> Join Class
      </Button>
    </div>
  );
}

function ScheduleClassDialog({ mentorId }: Readonly<{ mentorId: string }>) {
  const titleId = useId();
  const courseId2 = useId();
  const dateId = useId();
  const startId = useId();
  const endId = useId();
  const platformId = useId();
  const descId = useId();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [platform, setPlatform] = useState("demo");

  const { data: courses } = useQuery({
    queryKey: ["mentor-live-class-courses", mentorId],
    queryFn: () => listMentorCourses(mentorId),
    enabled: open,
  });

  const { create } = useLiveClassMutations();

  const resetForm = () => {
    setTitle("");
    setCourseId("");
    setDescription("");
    setScheduledDate("");
    setStartTime("");
    setEndTime("");
    setPlatform("demo");
  };

  const handleSubmit = () => {
    if (!title.trim() || !courseId || !scheduledDate || !startTime || !endTime) {
      toast.error("Title, course, date, and start/end time are required.");
      return;
    }
    if (endTime <= startTime) {
      toast.error("End time must be after the start time.");
      return;
    }
    create.mutate(
      { courseId, title: title.trim(), description: description.trim() || undefined, scheduledDate, startTime, endTime, meetingPlatform: platform },
      {
        onSuccess: () => {
          toast.success("Live class scheduled (demo).");
          setOpen(false);
          resetForm();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to schedule class."),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2">
          <Plus className="size-4" aria-hidden="true" /> Schedule Class
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a Live Class</DialogTitle>
          <DialogDescription>
            This creates a demo class — no real video connection is made yet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={titleId}>Class Title</Label>
            <Input id={titleId} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 4 Live Q&A" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={courseId2}>Course</Label>
            <select
              id={courseId2}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="">Select a course…</option>
              {(courses ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor={dateId}>Date</Label>
              <Input id={dateId} type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={startId}>Start</Label>
              <Input id={startId} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={endId}>End</Label>
              <Input id={endId} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={platformId}>Meeting Platform</Label>
            <select
              id={platformId}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="demo">SkillGuru Demo Room</option>
              <option value="zoom">Zoom (not yet connected)</option>
              <option value="google_meet">Google Meet (not yet connected)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={descId}>Description (optional)</Label>
            <Textarea id={descId} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={create.isPending}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={create.isPending} aria-busy={create.isPending} className="gap-2">
            {create.isPending ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Scheduling…</> : "Schedule Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MentorLiveClassesPage() {
  usePageMeta("Live Classes");
  const navigate = useNavigate();
  const { data: mentorId } = useMentorProfileId();
  const { grouped, isLoading, isError, refetch } = useMentorLiveClasses();

  const buckets: LiveClassBucket[] = ["today", "upcoming", "past"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-foreground">
            <Radio className="size-6 text-primary" aria-hidden="true" /> Live Classes
            <Badge variant="warning">Demo / Coming Soon</Badge>
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Schedule and run live sessions for your assigned courses. This is a demo experience — no real video provider is connected yet.
          </p>
        </div>
        {mentorId && <ScheduleClassDialog mentorId={mentorId} />}
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
                  No classes {bucket === "past" ? "yet" : `${bucket}`}.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((cls) => (
                    <ClassCard key={cls.id} cls={cls} onJoin={(id) => void navigate(`/mentor/live-classes/${id}/room`)} />
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
