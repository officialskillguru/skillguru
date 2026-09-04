import { useParams } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/hooks/useAuth";
import { useLiveClass } from "@/hooks/useLiveClasses";
import { LiveClassRoom } from "@/components/live-classes/LiveClassRoom";
import { Skeleton } from "@/components/ui/skeleton";

export default function MentorLiveClassRoomPage() {
  usePageMeta("Live Class Room");
  const { id } = useParams<{ id: string }>();
  const { authUser } = useAuth();
  const { data: liveClass, isLoading, isError } = useLiveClass(id);

  if (isLoading) return <Skeleton className="h-[calc(100vh-4rem)] w-full rounded-2xl" />;
  if (isError || !liveClass) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        This live class could not be found, or you don&apos;t have access to it.
      </div>
    );
  }

  return (
    <LiveClassRoom
      liveClass={liveClass}
      selfName={authUser?.profile.fullName ?? "Teacher"}
      selfRole="host"
      backTo="/mentor/live-classes"
    />
  );
}
