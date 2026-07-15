import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message = "We encountered an error loading this data. Please try again.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
      <AlertCircle className="mb-4 size-10 text-red-500" />
      <h3 className="mb-2 text-lg font-black text-red-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800">
          <RefreshCcw className="size-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
