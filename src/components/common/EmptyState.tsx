import { FileX2 } from "lucide-react";

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
        {icon || <FileX2 className="size-8" />}
      </div>
      <h3 className="mb-2 text-lg font-black text-slate-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-slate-500">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
