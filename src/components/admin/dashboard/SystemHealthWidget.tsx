import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Database, HardDrive, CreditCard, AlertTriangle } from "lucide-react";
import { getExtendedSupabaseClient } from "@/services/_shared";

async function fetchQuickHealth() {
  const supabase = getExtendedSupabaseClient();
  const [{ error: dbError }, { data: buckets }] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.storage.listBuckets(),
  ]);
  return {
    dbHealthy: !dbError,
    bucketCount: buckets?.length ?? 0,
  };
}

export function SystemHealthWidget() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", "quick-health"], queryFn: fetchQuickHealth });

  const items = [
    { label: "Database", icon: Database, healthy: data?.dbHealthy ?? false },
    { label: "Storage", icon: HardDrive, healthy: (data?.bucketCount ?? 0) > 0, detail: data ? `${data.bucketCount} buckets` : undefined },
    { label: "Payment Provider", icon: CreditCard, healthy: true, detail: "Mock" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black text-foreground tracking-tight">System Overview</h2>
        <Link to="/admin/health" className="text-xs font-semibold text-primary hover:underline">
          Full report
        </Link>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-sm text-foreground/80 font-medium">{item.label}</span>
              </div>
              {isLoading ? (
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="flex items-center gap-2">
                  {item.detail && <span className="text-[11px] text-muted-foreground font-medium">{item.detail}</span>}
                  <div className="flex items-center gap-1.5">
                    {item.healthy ? (
                      <>
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Healthy</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-3 text-destructive" />
                        <span className="text-xs font-semibold text-destructive">Issue</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
