import { SearchRegistry } from "./SearchRegistry";
import type { SearchRecord } from "../types";
import { SearchCache } from "./SearchCache";

export class SearchIndexer {
  static async buildIndex(): Promise<SearchRecord[]> {
    const cache = SearchCache.getInstance();
    
    // Check Cache
    const existingIndex = cache.getNormalizedIndex();
    if (existingIndex) {
      return existingIndex;
    }

    // Load from Registry
    const records = await SearchRegistry.loadAll();
    
    // Normalize and Index
    const indexed = records.map(record => ({
      ...record,
      // Create a unified searchable text field if needed (Fuse.js handles keys well though)
      _searchText: `${record.title} ${record.subtitle || ""} ${record.description || ""} ${record.keywords.join(" ")}`.toLowerCase()
    }));

    // Save to Cache
    cache.setNormalizedIndex(indexed);
    
    return indexed;
  }
}
