import { useSearch } from "../hooks/useSearch";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "course", label: "Courses" },
  { id: "mentor", label: "Mentors" },
  { id: "project", label: "Projects" },
  { id: "skill", label: "Skills" },
  { id: "faq", label: "FAQ" },
];

export function SearchFilters() {
  const { filter, setFilter } = useSearch();

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 md:px-6 py-3 border-b border-slate-100 no-scrollbar shrink-0">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => setFilter(f.id as "all" | "course" | "mentor" | "project" | "skill" | "faq")}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition",
            filter === f.id
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
