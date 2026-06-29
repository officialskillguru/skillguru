import { TrendingUp, ArrowRight } from "lucide-react";
import { useSearch } from "../hooks/useSearch";

const POPULAR_SEARCHES = [
  "Data Science",
  "Python",
  "Machine Learning",
  "React",
  "Cyber Security",
  "AWS",
];

const POPULAR_CATEGORIES = [
  { label: "Data Science & AI", icon: "🧠" },
  { label: "Development", icon: "💻" },
  { label: "Design", icon: "🎨" },
];

export function SearchPopular() {
  const { setQuery } = useSearch();

  return (
    <div className="space-y-8">
      {/* Popular Searches */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Trending Now</h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((query) => (
            <button
              key={query}
              onClick={() => setQuery(query)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E5EAF5] text-xs font-semibold text-slate-600 hover:border-[#5B35F2] hover:text-[#5B35F2] hover:shadow-sm transition"
            >
              <TrendingUp className="size-3" />
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Popular Categories */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Explore Categories</h3>
        <div className="space-y-2">
          {POPULAR_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setQuery(cat.label)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-[#E5EAF5] hover:border-[#5B35F2] hover:shadow-md transition group text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                <span className="text-sm font-bold text-[#111E79]">{cat.label}</span>
              </div>
              <ArrowRight className="size-4 text-slate-300 group-hover:text-[#5B35F2] transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
