import { useQuery } from "@tanstack/react-query";
import { getDashboardMetrics, getDashboardRecent, getDashboardChartData } from "@/services/dashboard.service";

export function useAdminDashboardMetrics() {
  return useQuery({
    queryKey: ["admin", "dashboard", "metrics"],
    queryFn: getDashboardMetrics,
  });
}

export function useAdminDashboardRecent() {
  return useQuery({
    queryKey: ["admin", "dashboard", "recent"],
    queryFn: getDashboardRecent,
  });
}

export function useAdminDashboardChart() {
  return useQuery({
    queryKey: ["admin", "dashboard", "chart"],
    queryFn: getDashboardChartData,
  });
}
