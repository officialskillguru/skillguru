import { type ReactNode } from "react";

export function MentorProfileSidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="lg:col-span-4 relative">
      {children}
    </aside>
  );
}
