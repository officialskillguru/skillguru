import { X } from "lucide-react";
import { type Mentor } from "../types";
import { MentorBookingWidget } from "./MentorBookingWidget";
import { useEffect, useRef } from "react";

export function MentorBookingModal({
  mentor,
  isOpen,
  onClose
}: {
  mentor: Mentor;
  isOpen: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape-to-close + focus trap + restore focus to the trigger on close,
  // matching standard dialog behavior.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Modal */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-booking-modal-title"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out translate-y-0 lg:hidden max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <h3 id="mentor-booking-modal-title" className="text-xl font-bold text-slate-900">Book Session</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <MentorBookingWidget mentor={mentor} isMobileModal />
        </div>
      </div>
    </>
  );
}
