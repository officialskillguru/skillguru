import type { SearchGroup, SearchResult } from "../types";
import { SearchResultCard } from "./SearchResultCard";

interface Props {
  group: SearchGroup;
  flatResults: SearchResult[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function SearchResultGroup({ group, flatResults, activeIndex, onSelect }: Props) {
  if (group.results.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
        {group.category}
      </h3>
      <div className="space-y-1">
        {group.results.map((result) => {
          const globalIndex = flatResults.indexOf(result);
          const isActive = globalIndex === activeIndex;

          return (
            <SearchResultCard
              key={result.record.id}
              result={result}
              isActive={isActive}
              onMouseEnter={() => {}}
              onClick={() => onSelect(globalIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}
