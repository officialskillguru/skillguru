import { Link } from "react-router-dom";
import { Activity as ActivityIcon } from "lucide-react";
import { useDashboardData } from "@/hooks/useAdminData";

export function RecentActivitiesWidget() {
  const { recent } = useDashboardData();
  const activities = recent.data ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Activities</h2>
        <Link to="/admin/audit-logs" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">
          View all
        </Link>
      </div>

      <div className="flex-1">
        {recent.isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity recorded yet.</p>
        ) : (
          <div className="space-y-6">
            {activities.map((activity, index) => {
              const isLast = index === activities.length - 1;
              return (
                <div key={activity.id} className="relative flex items-start gap-4">
                  {!isLast && <div className="absolute left-[15px] top-8 bottom-[-24px] w-0.5 bg-slate-100" />}
                  <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                    <ActivityIcon className="size-4 text-blue-600" />
                  </div>
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between pt-1.5 min-w-0">
                    <p className="text-xs text-slate-600 truncate mr-2">{activity.message}</p>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap mt-1 sm:mt-0">{activity.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
