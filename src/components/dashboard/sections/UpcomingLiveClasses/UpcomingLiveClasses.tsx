import { Link } from "react-router-dom";
import { Radio, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentLiveClasses } from "@/hooks/useLiveClasses";

export function UpcomingLiveClasses() {
  const { grouped, isLoading } = useStudentLiveClasses();
  const items = [...(grouped?.today ?? []), ...(grouped?.upcoming ?? [])].slice(0, 2);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl">Live Classes</CardTitle>
          <Badge variant="warning">Demo</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
            <Radio className="mb-2 text-muted-foreground opacity-30" size={32} aria-hidden="true" />
            <p className="text-sm font-semibold text-muted-foreground">No live classes scheduled yet.</p>
          </div>
        ) : (
          items.map((cls) => (
            <div key={cls.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="line-clamp-1 font-bold text-foreground">{cls.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {cls.courseTitle} · {new Date(cls.scheduled_date).toLocaleDateString()} · {cls.start_time.slice(0, 5)}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 gap-1.5 rounded-xl font-bold">
                <Link to={`/dashboard/live-classes/${cls.id}/room`}>
                  <Video className="size-3.5" aria-hidden="true" /> Join Demo
                </Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
