import type { SearchRecord } from "../types";

const HISTORY_KEY = "skillguru_search_history";
const VIEWED_KEY = "skillguru_search_viewed";
const MAX_HISTORY = 10;
const MAX_VIEWED = 5;

export class SearchHistoryService {
  private static readonly HISTORY_KEY = HISTORY_KEY;
  private static readonly VIEWED_KEY = VIEWED_KEY;
  private static readonly MAX_HISTORY = MAX_HISTORY;
  private static readonly MAX_VIEWED = MAX_VIEWED;

  static getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  }

  static addRecentSearch(query: string): void {
    if (!query || query.trim().length < 2) return;
    let searches = this.getRecentSearches();
    searches = searches.filter(q => q.toLowerCase() !== query.toLowerCase());
    searches.unshift(query.trim());
    if (searches.length > this.MAX_HISTORY) {
      searches.pop();
    }
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(searches));
  }

  static removeRecentSearch(query: string): void {
    let searches = this.getRecentSearches();
    searches = searches.filter(q => q !== query);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(searches));
  }

  static clearRecentSearches(): void {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  // --- Recently Viewed Items ---

  static getRecentlyViewed(): SearchRecord[] {
    try {
      const stored = localStorage.getItem(this.VIEWED_KEY);
      return stored ? (JSON.parse(stored) as SearchRecord[]) : [];
    } catch {
      return [];
    }
  }

  static addRecentlyViewed(record: SearchRecord): void {
    const viewed = this.getRecentlyViewed();
    const updated = [record, ...viewed.filter(r => r.id !== record.id)].slice(0, MAX_VIEWED);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(updated));
  }

  static clearRecentlyViewed(): void {
    localStorage.removeItem(VIEWED_KEY);
  }
}
