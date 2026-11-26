import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/hooks/useAuth";
import { useJoinLiveClass, useLiveClass } from "@/hooks/useLiveClasses";
import { LiveClassAccessError } from "@/services/live-classes.service";
import { LiveClassRoom } from "@/components/live-classes/LiveClassRoom";
import { FocusHeading } from "@/components/live-classes/FocusHeading";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIstSession } from "@/lib/date";
import type { ReactNode } from "react";

const BACK = "/dashboard/live-classes";

function RoomState({ icon, title, children }: Readonly<{ icon: ReactNode; title: string; children: ReactNode }>) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="flex justify-center">{icon}</div>
      <FocusHeading className="mt-3 text-xl font-black text-foreground">{title}</FocusHeading>
      <div className="mt-2 space-y-3 text-sm text-muted-foreground">{children}</div>
      <Link to={BACK} className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        Back to class schedule
      </Link>
    </div>
  );
}

/**
 * Student entry to a class room. Access is decided server-side by
 * join_live_class (active enrollment + class is live), which also records
 * attendance - opening this URL directly gets exactly the same checks.
 */
function StudentLiveClassRoomView({ id }: Readonly<{ id: string | undefined }>) {
  const { authUser } = useAuth();
  const { data: liveClass, isLoading, isError } = useLiveClass(id, { poll: true });
  const isLive = liveClass?.status === "live";
  const join = useJoinLiveClass(id, isLive);

  if (isLoading) return <Skeleton className="h-[calc(100vh-4rem)] w-full rounded-2xl" />;

  // RLS hides classes of courses the student is not actively enrolled in.
  if (isError || !liveClass) {
    return (
      <RoomState icon={<Lock className="size-9 text-muted-foreground" aria-hidden="true" />} title="You don't have access to this class">
        <p>Live classes are open to students enrolled in the course. If you just paid, your access appears as soon as the payment is confirmed.</p>
      </RoomState>
    );
  }

  const when = formatIstSession(liveClass.scheduled_date, liveClass.start_time, liveClass.end_time);

  if (liveClass.status === "scheduled") {
    return (
      <RoomState icon={<Clock className="size-9 text-warning" aria-hidden="true" />} title="Waiting for the teacher to start">
        <p><span className="font-semibold text-foreground">{liveClass.title}</span> · {when}</p>
        <p>This page checks every few seconds and opens the classroom as soon as {liveClass.mentorName ?? "your teacher"} starts the class.</p>
      </RoomState>
    );
  }

  if (liveClass.status === "completed") {
    return (
      <RoomState icon={<CheckCircle2 className="size-9 text-success" aria-hidden="true" />} title="This class has ended">
        <p><span className="font-semibold text-foreground">{liveClass.title}</span> was completed by {liveClass.mentorName ?? "your teacher"}.</p>
        {join.data?.attendanceRecorded && <p>Your attendance was recorded.</p>}
      </RoomState>
    );
  }

  if (liveClass.status === "cancelled") {
    return (
      <RoomState icon={<XCircle className="size-9 text-destructive" aria-hidden="true" />} title="This class was cancelled">
        <p>{liveClass.title} · {when}</p>
      </RoomState>
    );
  }

  if (join.isLoading) return <Skeleton className="h-[calc(100vh-4rem)] w-full rounded-2xl" />;
  if (join.isError) {
    const reason = join.error instanceof LiveClassAccessError ? join.error.reason : "other";
    return (
      <RoomState icon={<Lock className="size-9 text-muted-foreground" aria-hidden="true" />} title={reason === "not_enrolled" ? "You are not enrolled in this course" : "Could not join the class"}>
        <p>{join.error instanceof Error ? join.error.message : "Please try again."}</p>
      </RoomState>
    );
  }

  return (
    <LiveClassRoom
      liveClass={liveClass}
      selfId={authUser?.profile.id ?? ""}
      selfName={authUser?.profile.fullName ?? "Student"}
      selfRole="participant"
      backTo={BACK}
    />
  );
}

const STATUS_ANNOUNCEMENT: Record<string, string> = {
  live: "The class is live.",
  completed: "The teacher has ended this class.",
  cancelled: "This class was cancelled.",
};

export default function StudentLiveClassRoomPage() {
  usePageMeta("Live Class Room");
  const { id } = useParams<{ id: string }>();
  // Shares the polled query with the view below; the region stays mounted across
  // status changes so screen readers reliably hear "class is live" / "class ended".
  const { data: liveClass } = useLiveClass(id, { poll: true });
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {liveClass ? STATUS_ANNOUNCEMENT[liveClass.status] ?? "" : ""}
      </p>
      <StudentLiveClassRoomView id={id} />
    </>
  );
}
