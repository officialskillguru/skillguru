import { useMentorAnalytics } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsTab() {
  const { data: analytics, isLoading } = useMentorAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-foreground text-2xl font-black">Course Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (!analytics || analytics.length === 0)
    return (
      <div className="space-y-4">
        <h1 className="text-foreground text-2xl font-black">Course Analytics</h1>
        <div className="text-muted-foreground py-12 text-center text-sm font-semibold">
          No analytics available.
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-black">Course Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {analytics.map((stats) => (
          <article key={stats.id} className="border-border bg-card rounded-xl border p-6 shadow-sm">
            <h3 className="text-foreground text-lg font-black">{stats.title}</h3>
            <div className="border-border mt-4 grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <p className="text-muted-foreground text-[10px] font-black uppercase">
                  Enrollments
                </p>
                <p className="text-primary mt-1 text-xl font-black">{stats.enrollments}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-black uppercase">Completion</p>
                <p className="text-success mt-1 text-xl font-black">{stats.completionRate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-black uppercase">Avg Rating</p>
                <p className="text-warning mt-1 text-xl font-black">{stats.averageRating}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
