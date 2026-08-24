import type { ReactNode } from "react";

import { AIAgentWidget } from "@/components/site/AIAgentWidget";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";

export function MarketingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Navbar />
      {/* <main>, not <div>: this is the target of the Navbar skip link, and the
          page otherwise has no main landmark. */}
      <main id="main-content">
        {children}
      </main>
      <Footer />
      {/* Outside #main-content deliberately — a persistent widget inside the skip
          link's target would sit in the content users skip to. */}
      <AIAgentWidget />
    </div>
  );
}
