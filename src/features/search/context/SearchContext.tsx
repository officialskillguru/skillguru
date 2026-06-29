import { createContext } from "react";
import type { SearchEntityType } from "../types";

export interface SearchContextValue {
  isOpen: boolean;
  openSearch: (initialQuery?: string) => void;
  closeSearch: () => void;
  query: string;
  setQuery: (query: string) => void;
  filter: SearchEntityType | "all";
  setFilter: (filter: SearchEntityType | "all") => void;
}

export const SearchContext = createContext<SearchContextValue | undefined>(undefined);
