import Fuse from "fuse.js";
import { SearchIndexer } from "./SearchIndexer";
import { SearchQueryParser } from "./SearchQueryParser";
import { SearchRankingPipeline } from "./SearchRankingPipeline";
import type { SearchRecord, SearchResult, SearchGroup, SearchEntityType } from "../types";
import { SearchCache } from "./SearchCache";

export class SearchEngine {
  private static fuseInstance: Fuse<SearchRecord> | null = null;
  
  static async init(): Promise<void> {
    if (this.fuseInstance) return;
    
    const records = await SearchIndexer.buildIndex();
    this.fuseInstance = new Fuse(records, {
      keys: [
        { name: "title", weight: 3 },
        { name: "keywords", weight: 2 },
        { name: "aliases", weight: 2 },
        { name: "description", weight: 1 },
        { name: "category", weight: 1 },
      ],
      includeScore: true,
      includeMatches: true,
      threshold: 0.4, // Fuzzy threshold (0 = exact, 1 = match anything)
      ignoreLocation: true, // Don't penalize matches at the end of strings
      useExtendedSearch: true,
    });
  }

  static async search(rawQuery: string, filter: SearchEntityType | "all" = "all"): Promise<SearchGroup[]> {
    if (!this.fuseInstance) {
      await this.init();
    }

    if (!rawQuery.trim()) {
      return [];
    }

    // Check cache
    const cacheKey = `${rawQuery}_${filter}`;
    const cached = SearchCache.getInstance().getQueryResults(cacheKey);
    if (cached) return cached;

    const parsedQuery = SearchQueryParser.parse(rawQuery);
    parsedQuery.filter = filter;

    // Use extended search logic for Fuse to incorporate OR logic for aliases
    // Basically join aliases with `|`
    const fuseQueryString = parsedQuery.tokens.map(t => `'${t}`).join(" | "); 
    // Fallback to basic string if nothing complex
    const actualSearchQuery = parsedQuery.tokens.length > 1 ? fuseQueryString : parsedQuery.raw;

    const fuseResults = this.fuseInstance!.search(actualSearchQuery);

    const scoredResults: SearchResult[] = [];

    for (const result of fuseResults) {
      const record = result.item;
      
      // Apply Filter
      if (filter !== "all" && record.type !== filter) {
        continue;
      }

      // Format matches
      const matches = (result.matches || []).map(m => ({
        key: m.key as string,
        value: m.value as string,
        indices: m.indices as [number, number][]
      }));

      // Pass to Ranking Pipeline
      const ranked = SearchRankingPipeline.rank(record, parsedQuery, result.score || 0);
      ranked.matches = matches;
      scoredResults.push(ranked);
    }

    // Sort by final score descending
    scoredResults.sort((a, b) => b.score - a.score);

    // Group Results
    const groupsMap = new Map<string, SearchGroup>();
    
    for (const result of scoredResults) {
      const groupKey = result.record.category || "Other";
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          category: groupKey,
          type: result.record.type,
          results: []
        });
      }
      groupsMap.get(groupKey)!.results.push(result);
    }

    const finalGroups = Array.from(groupsMap.values());
    
    // Save to Cache
    SearchCache.getInstance().setQueryResults(cacheKey, finalGroups);
    
    return finalGroups;
  }
}
