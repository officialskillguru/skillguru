import { useState, useCallback, useEffect } from "react";
import { SearchContext } from "./SearchContext";
import { SearchAnalyticsService } from "../services/SearchAnalyticsService";
import { initializeSearchRegistry } from "../registry";
import { SearchEngine } from "../core/SearchEngine";
import type { SearchEntityType } from "../types";

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const p = new URLSearchParams(window.location.search);
    return p.has("q") || p.has("type");
  });
  
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") || "";
  });
  
  const [filter, setFilter] = useState<SearchEntityType | "all">(() => {
    if (typeof window === "undefined") return "all";
    return (new URLSearchParams(window.location.search).get("type") as SearchEntityType) || "all";
  });

  // Initialize engine once on mount
  useEffect(() => {
    initializeSearchRegistry();
    SearchEngine.init().catch(console.error);
  }, []);

  const openSearch = useCallback((initialQuery?: string) => {
    if (initialQuery) setQuery(initialQuery);
    setIsOpen(true);
    SearchAnalyticsService.trackOpen();
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    SearchAnalyticsService.trackClose();
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openSearch, closeSearch]);

  return (
    <SearchContext.Provider
      value={{
        isOpen,
        openSearch,
        closeSearch,
        query,
        setQuery,
        filter,
        setFilter,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}
