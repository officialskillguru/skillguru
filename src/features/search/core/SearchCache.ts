import type { SearchRecord, SearchGroup } from "../types";

export class SearchCache {
  private static instance: SearchCache;
  private normalizedIndex: SearchRecord[] | null = null;
  private tokenCache: Map<string, string[]> = new Map();
  private queryCache: Map<string, SearchGroup[]> = new Map();

  private constructor() {}

  public static getInstance(): SearchCache {
    if (!SearchCache.instance) {
      SearchCache.instance = new SearchCache();
    }
    return SearchCache.instance;
  }

  public getNormalizedIndex(): SearchRecord[] | null {
    return this.normalizedIndex;
  }

  public setNormalizedIndex(index: SearchRecord[]): void {
    this.normalizedIndex = index;
  }

  public getTokenized(query: string): string[] | null {
    return this.tokenCache.get(query) || null;
  }

  public setTokenized(query: string, tokens: string[]): void {
    this.tokenCache.set(query, tokens);
  }

  public getQueryResults(queryKey: string): SearchGroup[] | null {
    return this.queryCache.get(queryKey) || null;
  }

  public setQueryResults(queryKey: string, results: SearchGroup[]): void {
    this.queryCache.set(queryKey, results);
  }

  public clear(): void {
    this.normalizedIndex = null;
    this.tokenCache.clear();
    this.queryCache.clear();
  }

  public clearQueryCache(): void {
    this.queryCache.clear();
  }
}
