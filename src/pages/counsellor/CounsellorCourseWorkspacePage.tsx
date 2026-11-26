import { useId, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, CircleAlert, ExternalLink, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";

import { usePageMeta } from "@/hooks/usePageMeta";
import { getCourseById, getCourseCompleteness, CourseNotCompleteError } from "@/services/courses.service";
import { getCoursePurchaseOverview, listCourseTeachers, publishCourse } from "@/services/counsellor-courses.service";
import { useCourseLiveClasses, useLiveClassMutations } from "@/hooks/useLiveClasses";
import type { LiveClass } from "@/services/live-classes.service";
import { formatIstSession, todayInIst } from "@/lib/date";
import { formatInr, paymentMethodLabel } from "@/features/checkout/checkout-schema";
import { CourseDetailsEditor } from "@/components/shared/CourseDetailsEditor";
import { CourseCurriculumEditor } from "@/components/shared/CourseCurriculumEditor";
import { AttendanceTable } from "@/components/live-classes/AttendanceTable";
import { LIVE_CLASS_STATUS } from "@/components/live-classes/live-class-status";
import { COURSE_STATUS_BADGE } from "@/components/counsellor/course-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min((h ?? 0) * 60 + (m ?? 0) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ── Review & publish ─────────────────────────────────────────────────────────
function PublishPanel({ courseId, status, slug }: Readonly<{ courseId: string; status: string; slug: string }>) {
  const queryClient = useQueryClient();
  const { data: completeness, isLoading } = useQuery({ queryKey: ["course-completeness", courseId], queryFn: () => getCourseCompleteness(courseId) });
  const publish = useMutation({
    mutationFn: () => publishCourse(courseId),
    onSuccess: () => {
      toast.success("Course published. It is now visible in the student catalog.");
      void queryClient.invalidateQueries({ queryKey: ["counsellor-course", courseId] });
      void queryClient.invalidateQueries({ queryKey: ["counsellor-courses"] });
    },
    onError: (err) => {
      if (err instanceof CourseNotCompleteError) {
        void queryClient.invalidateQueries({ queryKey: ["course-completeness", courseId] });
        toast.error("Complete the missing items before publishing.");
      } else {
        toast.error(err instanceof Error ? err.message : "Could not publish the course.");
      }
    },
  });

  if (isLoading || !completeness) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-foreground">Publishing checklist</h2>
        <p className="text-sm text-muted-foreground">Every item must be complete before the course can be published to the catalog.</p>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Publishing requirements">
        {completeness.checks.map((c) => (
          <li key={c.key} className="flex items-center gap-3 px-4 py-3 text-sm">
            {c.met ? <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> : <CircleAlert className="size-4 text-warning" aria-hidden="true" />}
            <span className="text-foreground">{c.label}</span>
            <span className={["ml-auto text-xs font-semibold", c.met ? "text-success" : "text-destructive-text"].join(" ")}>{c.met ? "Done" : "To do"}</span>
          </li>
        ))}
      </ul>
      <p role="status" className="text-xs font-semibold text-muted-foreground">
        {completeness.isComplete ? "All requirements met. Ready to publish." : `${completeness.percent}% complete. Complete the remaining items in the Details and Syllabus tabs.`}
      </p>
      <div className="flex flex-wrap gap-3">
        {status === "published" ? (
          <Link to={`/courses/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            View in catalog <ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
          </Link>
        ) : (
          <Button type="button" onClick={() => publish.mutate()} disabled={publish.isPending || !completeness.isComplete} aria-busy={publish.isPending} className="gap-2">
            {publish.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Publish course
          </Button>
        )}
      </div>
      {status !== "published" && !completeness.isComplete && <p className="text-xs text-muted-foreground">Publish course is enabled once every item is done.</p>}
    </div>
  );
}

// ── Teacher & classes ────────────────────────────────────────────────────────
function ScheduleClassDialog({ courseId, courseTitle }: Readonly<{ courseId: string; courseTitle: string }>) {
  const ids = { title: useId(), date: useId(), time: useId(), duration: useId(), teacher: useId(), desc: useId() };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: todayInIst(), time: "", duration: "60", teacherId: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: teachers } = useQuery({ queryKey: ["course-teachers", courseId], queryFn: () => listCourseTeachers(courseId), enabled: open });
  const { create } = useLiveClassMutations();
  const teacherId = form.teacherId || teachers?.[0]?.id || "";

  const submit = () => {
    const next: Record<string, string> = {};
    if (form.title.trim().length < 3) next.title = "Enter a class title.";
    if (!form.date || form.date < todayInIst()) next.date = "Choose today or a later date.";
    if (!form.time) next.time = "Choose a start time.";
    if (!teacherId) next.teacher = "Assign a teacher to this course first.";
    setErrors(next);
    const firstInvalid = Object.keys(next)[0] as keyof typeof ids | undefined;
    if (firstInvalid) {
      // Move focus to the first invalid field so its linked error is announced.
      requestAnimationFrame(() => document.getElementById(ids[firstInvalid])?.focus());
      return;
    }
    create.mutate(
      {
        courseId,
        mentorId: teacherId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        scheduledDate: form.date,
        startTime: form.time,
        endTime: addMinutes(form.time, Number(form.duration)),
        meetingPlatform: "demo",
      },
      {
        onSuccess: () => {
          toast.success("Class scheduled. The teacher and enrolled students have been notified.");
          setOpen(false);
          setForm({ title: "", date: todayInIst(), time: "", duration: "60", teacherId: "", description: "" });
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Could not schedule the class."),
      }
    );
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });
  const err = (key: string, id: string) => (errors[key] ? <p id={`${id}-e`} className="text-xs font-semibold text-destructive-text">{errors[key]}</p> : null);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErrors({}); }}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2"><Plus className="size-4" aria-hidden="true" /> Schedule class</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a live class</DialogTitle>
          <DialogDescription>{courseTitle} · times are India Standard Time (IST).</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor={ids.title}>Class title</Label>
            <Input id={ids.title} {...field("title")} placeholder="Live Session 1: Python for Analysts" aria-invalid={!!errors.title} aria-describedby={errors.title ? `${ids.title}-e` : undefined} />
            {err("title", ids.title)}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={ids.date}>Date</Label>
              <Input id={ids.date} type="date" min={todayInIst()} {...field("date")} aria-invalid={!!errors.date} aria-describedby={errors.date ? `${ids.date}-e` : undefined} />
              {err("date", ids.date)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.time}>Start (IST)</Label>
              <Input id={ids.time} type="time" {...field("time")} aria-invalid={!!errors.time} aria-describedby={errors.time ? `${ids.time}-e` : undefined} />
              {err("time", ids.time)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.duration}>Duration</Label>
              <select id={ids.duration} {...field("duration")} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">120 min</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.teacher}>Teacher</Label>
            <select id={ids.teacher} value={teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))} aria-invalid={!!errors.teacher} aria-describedby={errors.teacher ? `${ids.teacher}-e` : undefined} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {(teachers ?? []).length === 0 && <option value="">No teacher assigned</option>}
              {(teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {err("teacher", ids.teacher)}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.desc}>Description (optional)</Label>
            <Input id={ids.desc} {...field("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={create.isPending}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} aria-busy={create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Schedule class
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClassesPanel({ courseId, courseTitle }: Readonly<{ courseId: string; courseTitle: string }>) {
  const { data: teachers } = useQuery({ queryKey: ["course-teachers", courseId], queryFn: () => listCourseTeachers(courseId) });
  const { data: classes, isLoading, isError } = useCourseLiveClasses(courseId);
  const { cancel } = useLiveClassMutations();
  const [attendanceFor, setAttendanceFor] = useState<LiveClass | null>(null);
  const [cancelling, setCancelling] = useState<LiveClass | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Teacher &amp; live classes</h2>
          <p className="text-sm text-muted-foreground">
            Teacher: {teachers && teachers.length > 0 ? teachers.map((t) => t.name).join(", ") : <span className="font-semibold text-destructive-text">none assigned</span>}.
            {" "}Change assignments in <Link to="/counsellor/mentors" className="font-semibold text-primary hover:underline">Mentor Management</Link>.
          </p>
        </div>
        <ScheduleClassDialog courseId={courseId} courseTitle={courseTitle} />
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : isError ? (
        <p role="alert" className="text-sm font-semibold text-destructive-text">Classes could not be loaded.</p>
      ) : !classes || classes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No classes scheduled yet. Students see “schedule to be announced” until you add one.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {classes.map((cls) => {
            const status = LIVE_CLASS_STATUS[cls.status] ?? { label: cls.status, variant: "muted" as const };
            return (
              <li key={cls.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{cls.title}</p>
                  <p className="text-xs text-muted-foreground">{formatIstSession(cls.scheduled_date, cls.start_time, cls.end_time)} · {cls.mentorName}</p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
                <Button type="button" size="sm" variant="outline" onClick={() => setAttendanceFor(cls)}>{cls.status === "completed" ? "Attendance" : "Roster"}</Button>
                {cls.status === "scheduled" && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setCancelling(cls)}>Cancel<span className="sr-only"> {cls.title}</span></Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {attendanceFor && (
        <Dialog open onOpenChange={(o) => !o && setAttendanceFor(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{attendanceFor.title}</DialogTitle>
              <DialogDescription>{formatIstSession(attendanceFor.scheduled_date, attendanceFor.start_time, attendanceFor.end_time)}</DialogDescription>
            </DialogHeader>
            <AttendanceTable classId={attendanceFor.id} poll={attendanceFor.status === "live"} />
          </DialogContent>
        </Dialog>
      )}
      {cancelling && (
        <Dialog open onOpenChange={(o) => !o && setCancelling(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel {cancelling.title}?</DialogTitle>
              <DialogDescription>Enrolled students are notified that this class is cancelled. This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCancelling(null)}>Keep class</Button>
              <Button
                type="button"
                variant="destructive"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(cancelling.id, {
                  onSuccess: () => { toast.success("Class cancelled and students notified."); setCancelling(null); },
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Could not cancel the class."),
                })}
              >
                Cancel class
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Enrollments & payments ───────────────────────────────────────────────────
const ORDER_BADGE: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
  completed: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  failed: { label: "Declined", variant: "destructive" },
  refunded: { label: "Refunded", variant: "muted" },
};

function EnrollmentsPanel({ courseId }: Readonly<{ courseId: string }>) {
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["course-purchase-overview", courseId],
    queryFn: () => getCoursePurchaseOverview(courseId),
    refetchInterval: 10_000,
  });
  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (isError) return <p role="alert" className="text-sm font-semibold text-destructive-text">Enrollment data could not be loaded.</p>;
  if (!rows || rows.length === 0) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No enrollments or checkout attempts for this course yet.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Latest checkout per student for this course (refreshes every 10 seconds)</caption>
        <thead className="bg-muted/40 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2">Student</th>
            <th scope="col" className="px-4 py-2">Enrollment</th>
            <th scope="col" className="px-4 py-2">Payment</th>
            <th scope="col" className="px-4 py-2">Amount</th>
            <th scope="col" className="px-4 py-2">Receipt</th>
            <th scope="col" className="px-4 py-2">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const order = r.orderStatus ? ORDER_BADGE[r.orderStatus] ?? { label: r.orderStatus, variant: "muted" as const } : null;
            return (
              <tr key={r.studentId}>
                <td className="px-4 py-2"><p className="font-semibold text-foreground">{r.fullName}</p><p className="text-xs text-muted-foreground">{r.email}</p></td>
                <td className="px-4 py-2">{r.enrollmentStatus ? <Badge variant={r.enrollmentStatus === "active" ? "success" : "muted"} className="capitalize">{r.enrollmentStatus}</Badge> : <span className="text-xs text-muted-foreground">Not enrolled</span>}</td>
                <td className="px-4 py-2">{order ? <Badge variant={order.variant}>{order.label}</Badge> : <span className="text-xs capitalize text-muted-foreground">{r.enrollmentSource ?? "—"}</span>}{r.paymentMethod && <p className="text-xs text-muted-foreground">{paymentMethodLabel(r.paymentMethod)}</p>}</td>
                <td className="px-4 py-2 text-foreground">{r.amount != null ? formatInr(r.amount) : "—"}</td>
                <td className="px-4 py-2 font-mono text-xs text-foreground">{r.invoiceNumber ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.orderedAt ?? r.enrolledAt ? format(new Date((r.orderedAt ?? r.enrolledAt)!), "d MMM, h:mm a") : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CounsellorCourseWorkspacePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["counsellor-course", courseId],
    queryFn: () => getCourseById(courseId!),
    enabled: !!courseId,
  });
  usePageMeta(course?.title ?? "Course");
  const [tab, setTab] = useState("review");

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (isError || !course) {
    return (
      <div role="alert" className="rounded-xl border border-border bg-card p-6 text-sm">
        This course could not be found. <Link to="/counsellor/courses" className="font-semibold text-primary underline">Back to courses</Link>
      </div>
    );
  }
  const status = COURSE_STATUS_BADGE[course.status] ?? { label: course.status, variant: "muted" as const };

  return (
    <div className="space-y-5">
      <Link to="/counsellor/courses" className="inline-flex items-center gap-1 rounded text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronLeft className="size-4" aria-hidden="true" /> All courses
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black text-foreground">{course.title}</h1>
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-sm font-semibold text-muted-foreground">{course.price ? formatInr(course.price) : "Free"}</span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="review">Review &amp; publish</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
          <TabsTrigger value="classes">Teacher &amp; classes</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments &amp; payments</TabsTrigger>
        </TabsList>
        <div className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <TabsContent value="review"><PublishPanel courseId={course.id} status={course.status} slug={course.slug} /></TabsContent>
          <TabsContent value="details"><CourseDetailsEditor courseId={course.id} viewerRole="counsellor" /></TabsContent>
          <TabsContent value="syllabus"><CourseCurriculumEditor courseId={course.id} courseTitle={course.title} courseStatus={course.status} hideStatusControls /></TabsContent>
          <TabsContent value="classes"><ClassesPanel courseId={course.id} courseTitle={course.title} /></TabsContent>
          <TabsContent value="enrollments"><EnrollmentsPanel courseId={course.id} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
