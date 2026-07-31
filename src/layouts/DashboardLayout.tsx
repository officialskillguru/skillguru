import { Outlet } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardShell } from "@/components/dashboard/layout/DashboardShell";

export function DashboardLayout() {
  usePageMeta("Learner Dashboard");

  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
