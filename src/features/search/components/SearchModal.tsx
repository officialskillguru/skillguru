import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "../hooks/useSearch";
import { SearchCommandPalette } from "./SearchCommandPalette";

// Internal Component wrapped by AnimatePresence
export function SearchModal() {
  const { isOpen, closeSearch } = useSearch();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col md:items-center md:pt-[10vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeSearch}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full h-full md:h-auto md:max-h-[80vh] md:max-w-4xl flex flex-col bg-white overflow-hidden shadow-2xl z-10"
          >
            <SearchCommandPalette />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
