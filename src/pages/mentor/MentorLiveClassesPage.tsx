import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Play, Plus, Radio, Video } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useMentorProfileId } from "@/hooks/useMentorPortal";
import { useMentorLiveClasses, useLiveClassMutations } from "@/hooks/useLiveClasses";
import { listMentorCourses } from "@/services/mentors.service";
import type { LiveClass, LiveClassBucket } from "@/services/live-classes.service";
import { LiveClassCard } from "@/components/live-classes/LiveClassCard";
import { AttendanceTable } from "@/components/live-classes/AttendanceTable";
import { formatIstSession, todayInIst } from "@/lib/date";
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

function StartClassDialog({ cls, onClose }: Readonly<{ cls: LiveClass; onClose: () => void }>) {
  const navigate = useNavigate();
  const { start } = useLiveClassMutations();
  const handleStart = () =>
    start.mutate(cls.id, {
      onSuccess: () => {
        toast.success("Class is live. Students can join now.");
        void navigate(`/mentor/live-classes/${cls.id}/room`);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Could not start the class."),
    });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start {cls.title}?</DialogTitle>
          <DialogDescription>Enrolled students are notified and can join from their class schedule as soon as you start.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Course</dt><dd className="text-right font-semibold text-foreground">{cls.courseTitle}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Scheduled</dt><dd className="text-right font-semibold text-foreground">{formatIstSession(cls.scheduled_date, cls.start_time, cls.end_time)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Room</dt><dd className="text-right font-semibold text-foreground">SkillGuru simulated classroom</dd></div>
        </dl>
        <div>
          <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Eligible students</h3>
          <AttendanceTable classId={cls.id} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={start.isPending}>Not yet</Button>
          <Button type="button" onClick={handleStart} disabled={start.isPending} aria-busy={start.isPending} className="gap-2">
            {start.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />} Start class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceDialog({ cls, onClose }: Readonly<{ cls: LiveClass; onClose: () => void }>) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cls.status === "completed" ? "Attendance" : "Student roster"} · {cls.title}</DialogTitle>
          <DialogDescription>{formatIstSession(cls.scheduled_date, cls.start_time, cls.end_time)}</DialogDescription>
        </DialogHeader>
        <AttendanceTable classId={cls.id} poll={cls.status === "live"} />
      </DialogContent>
    </Dialog>
  );
}

function MentorClassActions({ cls, onStart, onRoster }: Readonly<{ cls: LiveClass; onStart: () => void; onRoster: () => void }>) {
  const navigate = useNavigate();
  if (cls.status === "scheduled") {
    const future = cls.scheduled_date > todayInIst();
    return (
      <>
        <Button type="button" size="sm" className="gap-1.5" onClick={onStart} disabled={future} aria-describedby={future ? `start-note-${cls.id}` : undefined}>
          <Play className="size-3.5" aria-hidden="true" /> Start class
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onRoster}>Roster</Button>
        {future && <span id={`start-note-${cls.id}`} className="self-center text-xs text-muted-foreground">Can be started on the class day</span>}
      </>
    );
  }
  if (cls.status === "live") {
    return (
      <>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => void navigate(`/mentor/live-classes/${cls.id}/room`)}>
          <Video className="size-3.5" aria-hidden="true" /> Open classroom
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onRoster}>Attendance</Button>
      </>
    );
  }
  if (cls.status === "completed") {
    return <Button type="button" size="sm" variant="outline" onClick={onRoster}>View attendance</Button>;
  }
  return null;
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
  const [errors, setErrors] = useState<Partial<Record<"title" | "course" | "date" | "start" | "end", string>>>({});

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
    setErrors({});
  };

  const handleSubmit = () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Enter a class title.";
    if (!courseId) next.course = "Choose the course this class belongs to.";
    if (!scheduledDate) next.date = "Choose a date.";
    else if (scheduledDate < todayInIst()) next.date = "Choose today or a later date.";
    if (!startTime) next.start = "Choose a start time.";
    if (!endTime) next.end = "Choose an end time.";
    else if (startTime && endTime <= startTime) next.end = "End time must be after the start time.";
    setErrors(next);
    const fieldIds = { title: titleId, course: courseId2, date: dateId, start: startId, end: endId };
    const firstInvalid = (Object.keys(next) as Array<keyof typeof fieldIds>)[0];
    if (firstInvalid) {
      // Focus the first invalid field so its linked error message is announced.
      requestAnimationFrame(() => document.getElementById(fieldIds[firstInvalid])?.focus());
      return;
    }
    create.mutate(
      { courseId, title: title.trim(), description: description.trim() || undefined, scheduledDate, startTime, endTime, meetingPlatform: platform },
      {
        onSuccess: () => {
          toast.success("Live class scheduled. Enrolled students have been notified.");
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
            Date and times are India Standard Time (IST). Classes run in the SkillGuru simulated classroom.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={titleId}>Class Title</Label>
            <Input id={titleId} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 4 Live Q&A" required aria-invalid={!!errors.title} aria-describedby={errors.title ? `${titleId}-error` : undefined} />
            {errors.title && <p id={`${titleId}-error`} className="text-xs font-semibold text-destructive-text">{errors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor={courseId2}>Course</Label>
            <select
              id={courseId2}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
              aria-invalid={!!errors.course} aria-describedby={errors.course ? `${courseId2}-error` : undefined}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select a course…</option>
              {(courses ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            {errors.course && <p id={`${courseId2}-error`} className="text-xs font-semibold text-destructive-text">{errors.course}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={dateId}>Date (IST)</Label>
              <Input id={dateId} type="date" min={todayInIst()} required value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} aria-invalid={!!errors.date} aria-describedby={errors.date ? `${dateId}-error` : undefined} />
              {errors.date && <p id={`${dateId}-error`} className="text-xs font-semibold text-destructive-text">{errors.date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={startId}>Start</Label>
              <Input id={startId} type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-invalid={!!errors.start} aria-describedby={errors.start ? `${startId}-error` : undefined} />
              {errors.start && <p id={`${startId}-error`} className="text-xs font-semibold text-destructive-text">{errors.start}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={endId}>End</Label>
              <Input id={endId} type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-invalid={!!errors.end} aria-describedby={errors.end ? `${endId}-error` : undefined} />
              {errors.end && <p id={`${endId}-error`} className="text-xs font-semibold text-destructive-text">{errors.end}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={platformId}>Meeting Platform</Label>
            <select
              id={platformId}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  const { data: mentorId } = useMentorProfileId();
  const { grouped, isLoading, isError, refetch } = useMentorLiveClasses();
  const [starting, setStarting] = useState<LiveClass | null>(null);
  const [rosterFor, setRosterFor] = useState<LiveClass | null>(null);

  const buckets: LiveClassBucket[] = ["today", "upcoming", "past"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black text-foreground">
            <Radio className="size-6 text-primary" aria-hidden="true" /> Live Classes
            <Badge variant="info">Simulated classroom</Badge>
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Sessions for the courses you teach, including ones scheduled by counsellors. Times are IST.
          </p>
        </div>
        {mentorId && <ScheduleClassDialog mentorId={mentorId} />}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm font-semibold text-destructive-text">
          Failed to load live classes.
          <button type="button" onClick={() => void refetch()} className="ml-2 font-black underline">Retry</button>
        </div>
      ) : (
        buckets.map((bucket) => {
          const items = grouped?.[bucket] ?? [];
          return (
            <section key={bucket} aria-labelledby={`mentor-bucket-${bucket}`}>
              <h2 id={`mentor-bucket-${bucket}`} className="mb-3 text-sm font-black uppercase tracking-wider text-muted-foreground">{BUCKET_LABELS[bucket]}</h2>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs font-semibold text-muted-foreground">
                  No classes {bucket === "past" ? "yet" : bucket}.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((cls) => (
                    <LiveClassCard key={cls.id} cls={cls} showTeacher={false}>
                      <MentorClassActions cls={cls} onStart={() => setStarting(cls)} onRoster={() => setRosterFor(cls)} />
                    </LiveClassCard>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

      {starting && <StartClassDialog cls={starting} onClose={() => setStarting(null)} />}
      {rosterFor && <AttendanceDialog cls={rosterFor} onClose={() => setRosterFor(null)} />}
    </div>
  );
}
