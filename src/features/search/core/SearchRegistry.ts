import type { SearchRecord } from "../types";

type SourceLoader = () => Promise<SearchRecord[]> | SearchRecord[];

export class SearchRegistry {
  private static loaders: Map<string, SourceLoader> = new Map();

  static register(sourceName: string, loader: SourceLoader): void {
    if (!this.loaders.has(sourceName)) {
      this.loaders.set(sourceName, loader);
    }
  }

  static async loadAll(): Promise<SearchRecord[]> {
    const allRecords: SearchRecord[] = [];
    const results = await Promise.all(
      Array.from(this.loaders.values()).map(loader => Promise.resolve(loader()))
    );
    
    for (const res of results) {
      allRecords.push(...res);
    }
    
    return allRecords;
  }
}
