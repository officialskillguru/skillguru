import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useSearch } from "../hooks/useSearch";

export function SearchInput({ isLoading }: { isLoading?: boolean }) {
  const { query, setQuery } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    // Auto focus on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Debounce the actual query setting so we don't re-render entire results too wildly
  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(localQuery);
    }, 150); // 150ms debounce
    return () => clearTimeout(timeout);
  }, [localQuery, setQuery]);

  return (
    <div className="relative flex items-center w-full h-16 border-b border-slate-100 bg-white px-4 md:px-6 shrink-0">
      <Search className="size-5 text-slate-400 mr-3" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search courses, mentors, skills..."
        className="flex-1 h-full bg-transparent border-none outline-none text-slate-900 text-[17px] font-medium placeholder:text-slate-400 placeholder:font-normal"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
      />
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="size-5 text-slate-400 animate-spin" />
        ) : localQuery ? (
          <button
            onClick={() => setLocalQuery("")}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Clear search"
          >
            <X className="size-5" />
          </button>
        ) : null}
        
        <div className="hidden md:flex items-center gap-1">
          <kbd className="h-6 px-1.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-500 flex items-center justify-center">ESC</kbd>
          <span className="text-xs text-slate-400 font-medium">to close</span>
        </div>
      </div>
    </div>
  );
}
