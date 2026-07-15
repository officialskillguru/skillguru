import { type ReactNode } from "react";

export function MentorProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted pb-24">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-8">
        {children}
      </div>
    </div>
  );
}
