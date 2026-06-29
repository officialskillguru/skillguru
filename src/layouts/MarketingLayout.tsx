import type { ReactNode } from "react";

import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";

export function MarketingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-svh bg-white text-[#0F172A]">
      <Navbar />
      <div id="main-content">
        {children}
      </div>
      <Footer />
    </div>
  );
}
