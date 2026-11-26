import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePageMeta } from "@/hooks/usePageMeta";
import { createCourseDraft, listCounsellorCourses, listTeachers } from "@/services/counsellor-courses.service";
import { formatInr } from "@/features/checkout/checkout-schema";
import { Badge } from "@/components/ui/badge";
import { COURSE_STATUS_BADGE } from "@/components/counsellor/course-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function NewCourseDialog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ids = { title: useId(), teacher: useId(), price: useId() };
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: teachers, isLoading } = useQuery({ queryKey: ["counsellor-teachers"], queryFn: listTeachers, enabled: open });

  const create = useMutation({
    mutationFn: createCourseDraft,
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: ["counsellor-courses"] });
      toast.success("Draft created. Add the description, syllabus and cover image next.");
      setOpen(false);
      void navigate(`/counsellor/courses/${course.id}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create the course."),
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (title.trim().length < 5) next.title = "Enter a course title of at least 5 characters.";
    if (!teacherId) next.teacher = "Choose the teacher who will run this course.";
    const amount = Number(price);
    if (!price || Number.isNaN(amount) || amount < 0) next.price = "Enter the course price in rupees (0 for a free course).";
    setErrors(next);
    const firstInvalid = Object.keys(next)[0] as keyof typeof ids | undefined;
    if (firstInvalid) {
      // Move focus to the first invalid field so its linked error is announced.
      requestAnimationFrame(() => document.getElementById(ids[firstInvalid])?.focus());
      return;
    }
    create.mutate({ title, teacherId, price: amount });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErrors({}); }}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2"><Plus className="size-4" aria-hidden="true" /> New course</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a course draft</DialogTitle>
          <DialogDescription>Drafts are hidden from students until you publish them.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor={ids.title}>Course title</Label>
            <Input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} aria-describedby={errors.title ? `${ids.title}-e` : undefined} placeholder="Data Analytics with Python & Power BI" />
            {errors.title && <p id={`${ids.title}-e`} className="text-xs font-semibold text-destructive-text">{errors.title}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.teacher}>Teacher</Label>
            <select id={ids.teacher} value={teacherId} onChange={(e) => setTeacherId(e.target.value)} aria-invalid={!!errors.teacher} aria-describedby={errors.teacher ? `${ids.teacher}-e` : undefined} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">{isLoading ? "Loading teachers…" : "Select a teacher…"}</option>
              {(teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.teacher && <p id={`${ids.teacher}-e`} className="text-xs font-semibold text-destructive-text">{errors.teacher}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.price}>Price (INR)</Label>
            <Input id={ids.price} type="number" inputMode="numeric" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={!!errors.price} aria-describedby={errors.price ? `${ids.price}-e` : undefined} placeholder="14999" />
            {errors.price && <p id={`${ids.price}-e`} className="text-xs font-semibold text-destructive-text">{errors.price}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={create.isPending}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} aria-busy={create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save as draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CounsellorCoursesPage() {
  usePageMeta("Courses");
  const { data: courses, isLoading, isError, refetch } = useQuery({ queryKey: ["counsellor-courses"], queryFn: listCounsellorCourses });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Draft, review and publish courses, schedule their live classes, and follow enrollments. Assign teachers across courses from{" "}
            <Link to="/counsellor/mentors" className="font-semibold text-primary hover:underline">Mentor Management</Link>.
          </p>
        </div>
        <NewCourseDialog />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm font-semibold text-destructive-text">
          Courses could not be loaded. <button type="button" className="underline" onClick={() => void refetch()}>Retry</button>
        </div>
      ) : !courses || courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-8" aria-hidden="true" />} title="No courses yet" description="Create the first course draft with New course." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Course</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Price</th>
                <th scope="col" className="px-4 py-3">Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => {
                const status = COURSE_STATUS_BADGE[c.status] ?? { label: c.status, variant: "muted" as const };
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to={`/counsellor/courses/${c.id}`} className="font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Badge variant={status.variant}>{status.label}</Badge></td>
                    <td className="px-4 py-3 text-foreground">{c.price ? formatInr(c.price) : "Free"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.teacherNames.length === 0 ? <span className="font-semibold text-destructive-text">No teacher assigned</span> : c.teacherNames.join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
