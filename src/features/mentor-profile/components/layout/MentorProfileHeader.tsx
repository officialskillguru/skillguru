import { MentorHero } from "../MentorHero";
import { type Mentor } from "../../types";

export function MentorProfileHeader({ mentor }: { mentor: Mentor }) {
  // We can add breadcrumbs here in the future
  return (
    <header className="mb-8">
      <div className="text-sm font-medium text-slate-500 mb-6">
        Home / Mentors / <span className="text-slate-900">{mentor.name}</span>
      </div>
      <MentorHero mentor={mentor} />
    </header>
  );
}
