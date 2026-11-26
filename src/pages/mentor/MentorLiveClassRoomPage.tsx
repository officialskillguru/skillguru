import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock, Play } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/hooks/useAuth";
import { useLiveClass, useLiveClassMutations } from "@/hooks/useLiveClasses";
import { LiveClassRoom } from "@/components/live-classes/LiveClassRoom";
import { AttendanceTable } from "@/components/live-classes/AttendanceTable";
import { FocusHeading } from "@/components/live-classes/FocusHeading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIstSession } from "@/lib/date";

const BACK = "/mentor/live-classes";

/** Teacher classroom: start a scheduled class, teach it live, end it, then review attendance. */
export default function MentorLiveClassRoomPage() {
  usePageMeta("Live Class Room");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const { data: liveClass, isLoading, isError } = useLiveClass(id, { poll: true });
  const { start, end } = useLiveClassMutations();

  if (isLoading) return <Skeleton className="h-[calc(100vh-4rem)] w-full rounded-2xl" />;
  if (isError || !liveClass) {
    return (
      <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
        <Lock className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-black text-foreground">This class isn&apos;t available to you</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only teachers assigned to the course can open its classroom controls.</p>
        <Link to={BACK} className="mt-6 inline-block text-sm font-bold text-primary underline">Back to live classes</Link>
      </div>
    );
  }

  const when = formatIstSession(liveClass.scheduled_date, liveClass.start_time, liveClass.end_time);

  if (liveClass.status === "scheduled") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <FocusHeading className="text-xl font-black text-foreground">{liveClass.title}</FocusHeading>
        <p className="mt-1 text-sm text-muted-foreground">{liveClass.courseTitle} · {when}</p>
        <p className="mt-4 text-sm text-muted-foreground">Starting the class marks it live and lets enrolled students join from their class schedule.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            className="gap-2"
            disabled={start.isPending}
            aria-busy={start.isPending}
            onClick={() => start.mutate(liveClass.id, { onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start the class.") })}
          >
            {start.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />} Start class
          </Button>
          <Button type="button" variant="outline" onClick={() => void navigate(BACK)}>Back</Button>
        </div>
      </div>
    );
  }

  if (liveClass.status === "completed" || liveClass.status === "cancelled") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-8 shrink-0 text-success" aria-hidden="true" />
          <div>
            <FocusHeading className="text-xl font-black text-foreground">{liveClass.status === "completed" ? "Class ended" : "Class cancelled"}</FocusHeading>
            <p className="text-sm text-muted-foreground">{liveClass.title} · {when}</p>
          </div>
        </div>
        {liveClass.status === "completed" && (
          <section aria-labelledby="attendance-heading">
            <h2 id="attendance-heading" className="text-sm font-black uppercase tracking-wide text-muted-foreground">Attendance</h2>
            <div className="mt-2"><AttendanceTable classId={liveClass.id} /></div>
          </section>
        )}
        <Link to={BACK} className="inline-block text-sm font-bold text-primary underline">Back to live classes</Link>
      </div>
    );
  }

  return (
    <LiveClassRoom
      liveClass={liveClass}
      selfId={authUser?.profile.id ?? ""}
      selfName={authUser?.profile.fullName ?? "Teacher"}
      selfRole="host"
      backTo={BACK}
      ending={end.isPending}
      onEndClass={() =>
        end.mutate(liveClass.id, {
          onSuccess: () => toast.success("Class ended. Attendance is saved."),
          onError: (e) => toast.error(e instanceof Error ? e.message : "Could not end the class."),
        })
      }
    />
  );
}
