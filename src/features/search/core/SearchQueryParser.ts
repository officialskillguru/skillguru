import { searchSynonyms } from "../constants/searchSynonyms";
import type { SearchQuery } from "../types";

export class SearchNormalizer {
  static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s]/g, "") // Remove special characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  static tokenize(text: string): string[] {
    return this.normalizeText(text).split(" ").filter(Boolean);
  }
}

export class SearchQueryParser {
  static parse(rawQuery: string): SearchQuery {
    const normalized = SearchNormalizer.normalizeText(rawQuery);
    const tokens = SearchNormalizer.tokenize(rawQuery);
    
    // Alias / Synonym expansion
    const expandedTokens = new Set<string>();
    
    for (const token of tokens) {
      expandedTokens.add(token);
      
      // Look for synonyms
      for (const [key, aliases] of Object.entries(searchSynonyms)) {
        if (key === token) {
          aliases.forEach(a => {
            const aliasTokens = SearchNormalizer.tokenize(a);
            aliasTokens.forEach(at => expandedTokens.add(at));
          });
        }
      }
    }
    
    return {
      raw: rawQuery,
      normalized,
      tokens: Array.from(expandedTokens),
    };
  }
}
