import * as React from "react";
import { DashboardTopbar } from "./DashboardTopbar";
import { DashboardSidebar, MobileSidebarDrawer } from "./DashboardSidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-secondary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-secondary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <DashboardTopbar onOpenMenu={() => setDrawerOpen(true)} />

      <div className="flex">
        <DashboardSidebar />
        <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 lg:pl-[280px]">
          {/* Max width container for enterprise spacing */}
          <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
