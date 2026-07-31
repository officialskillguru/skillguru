import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function DashboardHeader() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setLastRefreshed(new Date());
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live platform metrics — updated {lastRefreshed.toLocaleTimeString()}.
        </p>
      </div>
      <button
        onClick={() => void handleRefresh()}
        disabled={refreshing}
        className="flex items-center gap-2 bg-card border border-border rounded-md px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RefreshCw className={`size-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
        <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
      </button>
    </div>
  );
}
