import { X } from "lucide-react";
import { type Mentor } from "../types";
import { MentorBookingWidget } from "./MentorBookingWidget";
import { useEffect } from "react";

export function MentorBookingModal({ 
  mentor, 
  isOpen, 
  onClose 
}: { 
  mentor: Mentor; 
  isOpen: boolean; 
  onClose: () => void;
}) {
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Modal */}
      <div 
        className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out translate-y-0 lg:hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <h3 className="text-xl font-bold text-slate-900">Book Session</h3>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <MentorBookingWidget mentor={mentor} isMobileModal />
        </div>
      </div>
    </>
  );
}
