import { useState } from "react";
import { Clock, X } from "lucide-react";
import { SearchHistoryService } from "../services/SearchHistoryService";
import { useSearch } from "../hooks/useSearch";

export function SearchHistory() {
  const [history, setHistory] = useState<string[]>(() => SearchHistoryService.getRecentSearches());
  const { setQuery } = useSearch();

  const handleRemove = (e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    SearchHistoryService.removeRecentSearch(q);
    setHistory(SearchHistoryService.getRecentSearches());
  };

  const handleClear = () => {
    SearchHistoryService.clearRecentSearches();
    setHistory([]);
  };

  if (history.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Searches</h3>
        <button onClick={handleClear} className="text-xs text-secondary hover:underline">Clear</button>
      </div>
      <div className="space-y-1">
        {history.map((q) => (
          <button
            key={q}
            onClick={() => setQuery(q)}
            className="w-full flex items-center justify-between group px-3 py-2 rounded-xl hover:bg-white hover:shadow-sm transition text-left"
          >
            <div className="flex items-center gap-3">
              <Clock className="size-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-primary">{q}</span>
            </div>
            <span
              onClick={(e) => handleRemove(e, q)}
              className="p-1 rounded-full text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-500 transition"
            >
              <X className="size-3.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
