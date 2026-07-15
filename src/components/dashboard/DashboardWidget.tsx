import type { DashboardMetric } from "@/types/platform";

export function DashboardWidget({ metric }: Readonly<{ metric: DashboardMetric }>) {
  const Icon = metric.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-primary">
          <Icon className="size-5" />
        </div>
        <span className="text-xs font-bold text-emerald-600">{metric.trend}</span>
      </div>
      <p className="mt-6 text-sm font-bold text-muted-foreground">{metric.label}</p>
      <p className="mt-1 text-3xl font-black text-foreground">{metric.value}</p>
    </article>
  );
}
