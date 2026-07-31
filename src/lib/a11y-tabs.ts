/** Shared roving-tabindex arrow-key logic for manually-composed `role="tablist"` widgets (APG tabs pattern), used by several tab bars across the mentor module that each have their own visual styling but need the same keyboard behavior. */
export function getNextTabIndex(currentIndex: number, key: string, count: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
