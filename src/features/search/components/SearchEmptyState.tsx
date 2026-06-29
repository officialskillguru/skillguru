import { Search } from "lucide-react";
import { useSearch } from "../hooks/useSearch";

export function SearchEmptyState() {
  const { query, setQuery } = useSearch();

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
      <div className="grid place-items-center size-16 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
        <Search className="size-8 text-slate-300" />
      </div>
      
      <div className="max-w-xs mx-auto">
        <h3 className="text-lg font-bold text-slate-900 mb-2">No results found</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          We couldn't find anything matching <span className="font-semibold text-slate-700">"{query}"</span>. 
          Try checking for typos or using different keywords.
        </p>
      </div>
      
      <div className="pt-6 border-t border-slate-100 w-full max-w-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Try searching for</p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Data Science", "Python", "React", "Mentors"].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 transition"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
