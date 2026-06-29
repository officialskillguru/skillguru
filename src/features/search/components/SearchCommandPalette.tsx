import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SearchInput } from "./SearchInput";
import { SearchFilters } from "./SearchFilters";
import { useSearch } from "../hooks/useSearch";
import { SearchEngine } from "../core/SearchEngine";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { SearchHistoryService } from "../services/SearchHistoryService";
import { SearchAnalyticsService } from "../services/SearchAnalyticsService";
import type { SearchGroup, SearchResult } from "../types";

// Will implement these next
import { SearchHistory } from "./SearchHistory";
import { SearchPopular } from "./SearchPopular";
import { SearchResultGroup } from "./SearchResultGroup";
import { SearchEmptyState } from "./SearchEmptyState";

export function SearchCommandPalette() {
  const { query, filter, closeSearch } = useSearch();
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    results.forEach(group => {
      flat.push(...group.results);
    });
    return flat;
  }, [results]);

  // Reset results in render phase when query is cleared
  if (!query && results.length > 0) {
    setResults([]);
  }

  useEffect(() => {
    let active = true;
    
    if (!query) return;

    const fetchResults = async () => {
      setIsLoading(true);
      const res = await SearchEngine.search(query, filter);
      if (active) {
        setResults(res);
        setIsLoading(false);
        SearchAnalyticsService.trackQuery(query, res.reduce((acc, g) => acc + g.results.length, 0));
      }
    };
    
    fetchResults().catch(console.error);
    
    return () => { active = false; };
  }, [query, filter]);

  const handleSelect = (index: number) => {
    const selected = flatResults[index];
    if (selected) {
      SearchHistoryService.addRecentSearch(query);
      SearchHistoryService.addRecentlyViewed(selected.record);
      SearchAnalyticsService.trackResultClick(selected.record.id, selected.record.type, index);
      closeSearch();
      void navigate(selected.record.url);
    }
  };

  const { activeIndex } = useKeyboardNavigation(
    flatResults.length,
    handleSelect,
    closeSearch,
    true
  );

  const hasQuery = query.trim().length > 0;
  const hasResults = flatResults.length > 0;

  return (
    <div className="flex flex-col h-full bg-white md:rounded-2xl overflow-hidden shadow-2xl">
      <SearchInput isLoading={isLoading} />
      {hasQuery && <SearchFilters />}

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Column (Discovery) */}
        {!hasQuery && (
          <div className="flex-1 md:w-1/3 md:max-w-[280px] md:border-r border-slate-100 bg-slate-50/50 p-6 overflow-y-auto">
            <SearchHistory />
            <SearchPopular />
          </div>
        )}

        {/* Right Column (Results) */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {!hasQuery ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Type to start searching...
            </div>
          ) : hasResults ? (
            <div className="space-y-6 pb-20">
              {results.map((group) => (
                <SearchResultGroup
                  key={group.category}
                  group={group}
                  flatResults={flatResults}
                  activeIndex={activeIndex}
                  onSelect={(idx) => handleSelect(idx)}
                />
              ))}
            </div>
          ) : !isLoading ? (
            <SearchEmptyState />
          ) : (
            <div className="space-y-4">
              {/* Basic Skeleton */}
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-4 p-3 animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
