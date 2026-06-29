import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Drawer({
  open,
  children,
  onClose,
}: Readonly<{ open: boolean; children: ReactNode; onClose: () => void }>) {
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }
    
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (event.key === "Tab") {
        const drawer = drawerRef.current;
        if (!drawer) {
          return;
        }

        const focusable = drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element
    const timer = setTimeout(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>(
        'button, a[href], input',
      );
      first?.focus();
    }, 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={open ? "fixed inset-0 z-50 lg:hidden" : "hidden"}
      role="dialog"
      aria-modal={open}
      aria-label="Navigation menu"
    >
      <button type="button" className="absolute inset-0 bg-[#031B34]/80 backdrop-blur-sm transition-opacity" aria-label="Close navigation" onClick={onClose} />
      <aside ref={drawerRef} className="absolute left-0 top-0 flex h-full w-[min(88vw,380px)] flex-col overflow-y-auto bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
        <button type="button" onClick={onClose} className="ml-auto flex rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
          <X className="size-5" />
        </button>
        {children}
      </aside>
    </div>
  );
}
