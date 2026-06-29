export type SearchEntityType =
  | "course"
  | "mentor"
  | "project"
  | "skill"
  | "faq"
  | "category"
  | "story"
  | "action";

export interface SearchRecord {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string; // Grouping category (e.g. "Courses", "Mentors")
  url: string; // The URL to navigate to
  icon?: string; // Lucide icon name or image URL
  image?: string; // Image URL for rich results
  keywords: string[];
  aliases?: string[];
  tags?: string[];
  popularity: number; // 0-100 score
  updatedAt?: string;
  metadata?: Record<string, unknown>; // Extensible for specific entities
}

export interface SearchQuery {
  raw: string;
  normalized: string;
  tokens: string[];
  filter?: SearchEntityType | "all";
}

export interface SearchResult {
  record: SearchRecord;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  key: string;
  value: string;
  indices: [number, number][]; // Start and end index of match for highlighting
}

export interface SearchGroup {
  category: string;
  type: SearchEntityType;
  results: SearchResult[];
}
