import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { MarketingLayout } from "@/layouts/MarketingLayout";
import { AnalyticsProvider } from "@/context/AnalyticsProvider";
import { SearchProvider, SearchModal } from "@/features/search";
import { ScrollToTop } from "@/components/common/ScrollToTop";

export function MarketingRoute({ children }: Readonly<{ children: ReactNode }>) {
  return <MarketingLayout>{children}</MarketingLayout>;
}

export function RootRoute() {
  return (
    <AnalyticsProvider>
      <SearchProvider>
        <ScrollToTop />
        <SearchModal />
        <Outlet />
      </SearchProvider>
    </AnalyticsProvider>
  );
}
