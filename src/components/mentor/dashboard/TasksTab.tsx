import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useMentorOwnTasks, useUpdateMentorTaskStatus } from "@/hooks/useMentorPortal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/services/crm.service";

const PRIORITY_LABELS: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Critical" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function TasksTab() {
  const { data: tasks = [], isLoading, isError, refetch } = useMentorOwnTasks();
  const updateStatus = useUpdateMentorTaskStatus();

  const handleStatusChange = (task: Task, status: Task["status"]) => {
    updateStatus.mutate(
      { id: task.id, status },
      {
        onSuccess: () => toast.success(`Task marked ${status.replace("_", " ")}.`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update task."),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-semibold text-red-700">Failed to load your tasks.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 rounded-md bg-red-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-700 hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return <div className="py-12 text-center text-sm font-semibold text-muted-foreground">No tasks assigned to you yet.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">My Tasks</h2>
      <div className="space-y-3">
        {tasks.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-foreground">{t.title}</p>
                <p className="text-xs font-bold text-muted-foreground">
                  {PRIORITY_LABELS[t.priority] ?? t.priority} · {t.due_date ? `Due ${formatDate(t.due_date)}` : "No due date"}
                </p>
                {t.description && <p className="mt-2 text-sm text-foreground/80">{t.description}</p>}
              </div>
              <label htmlFor={`task-status-${t.id}`} className="sr-only">Status for {t.title}</label>
              <select
                id={`task-status-${t.id}`}
                value={t.status}
                onChange={(e) => handleStatusChange(t, e.target.value as Task["status"])}
                disabled={updateStatus.isPending}
                className="h-9 shrink-0 rounded-md border border-border bg-background px-2 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            {t.status === "completed" && t.completed_at && (
              <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="size-3" aria-hidden="true" /> Completed {formatDate(t.completed_at)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
