import { useCallback, useState } from "react";

const THEME_STORAGE_KEY = "theme";

/**
 * Shared light/dark theme state — single source of truth for every dashboard
 * shell (previously each shell that had a toggle at all reimplemented this
 * itself; the Admin shell's own copy also never wrote an init-time class
 * before mount, so a hard refresh silently dropped back to light despite
 * `localStorage.theme` still saying "dark"). `index.html` applies the
 * persisted value before first paint to avoid a flash; this hook keeps
 * React state and the DOM class in sync after that.
 */
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // localStorage unavailable (private mode, etc.) - theme just won't persist across reloads
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
