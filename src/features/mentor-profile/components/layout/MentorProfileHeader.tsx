import { Link } from "react-router-dom";
import { MentorHero } from "../MentorHero";
import { type Mentor } from "../../types";

export function MentorProfileHeader({ mentor, onBookClick }: { mentor: Mentor; onBookClick?: () => void }) {
  return (
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm font-medium text-slate-500">
        <Link to="/" className="hover:text-slate-700">Home</Link> / <Link to="/mentors" className="hover:text-slate-700">Mentors</Link> / <span className="text-slate-900" aria-current="page">{mentor.name}</span>
      </nav>
      <MentorHero mentor={mentor} onBookClick={onBookClick} />
    </header>
  );
}
