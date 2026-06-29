import { useState, useEffect } from "react";

export function useKeyboardNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  onEscape?: () => void,
  isOpen?: boolean
) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [prevItemCount, setPrevItemCount] = useState(itemCount);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (itemCount !== prevItemCount || isOpen !== prevIsOpen) {
    setActiveIndex(-1);
    setPrevItemCount(itemCount);
    setPrevIsOpen(isOpen);
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % itemCount);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + itemCount) % itemCount);
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < itemCount) {
          e.preventDefault();
          onSelect(activeIndex);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onEscape?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, itemCount, activeIndex, onSelect, onEscape]);

  return { activeIndex, setActiveIndex };
}
