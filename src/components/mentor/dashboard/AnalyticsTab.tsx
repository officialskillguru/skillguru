import { useMentorAnalytics } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsTab() {
  const { data: analytics, isLoading } = useMentorAnalytics();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!analytics || analytics.length === 0) return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">No analytics available.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">Course Analytics</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {analytics.map((stats) => (
          <article key={stats.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-black text-foreground">{stats.title}</h3>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Enrollments</p>
                <p className="mt-1 text-xl font-black text-primary">{stats.enrollments}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Completion</p>
                <p className="mt-1 text-xl font-black text-success">{stats.completionRate}%</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Avg Rating</p>
                <p className="mt-1 text-xl font-black text-warning">{stats.averageRating}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
