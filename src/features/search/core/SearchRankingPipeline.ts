import type { SearchRecord, SearchResult, SearchQuery } from "../types";

export class SearchRankingPipeline {
  static rank(record: SearchRecord, query: SearchQuery, fuseScore: number): SearchResult {
    const score = fuseScore; // lower is better in fuse.js (0 is perfect)
    let finalScore = (1 - score) * 100; // Convert to 0-100 where 100 is best

    const queryStr = query.normalized;
    const title = record.title.toLowerCase();
    
    // 1. Exact Match Boost
    if (title === queryStr) {
      finalScore += 50;
    }
    
    // 2. Prefix Match Boost
    else if (title.startsWith(queryStr)) {
      finalScore += 30;
    }
    
    // 3. Keyword Match Boost
    else if (title.includes(queryStr)) {
      finalScore += 20;
    }
    
    // 4. Popularity Score (0-100) -> Max 10 points contribution
    finalScore += (record.popularity / 100) * 10;
    
    // 5. Category Boost (Example: Courses get slight preference)
    if (record.type === "course") {
      finalScore += 5;
    }

    return {
      record,
      score: finalScore,
      matches: [] // Fuse matches will be injected by the engine
    };
  }
}
