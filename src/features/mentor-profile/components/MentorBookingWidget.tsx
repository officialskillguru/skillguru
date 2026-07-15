import { Clock, Globe, Video, ArrowRight, Loader2 } from "lucide-react";
import { useBookingWidget } from "../hooks/useBookingWidget";
import { type Mentor } from "../types";

export function MentorBookingWidget({ mentor, isMobileModal = false }: { mentor: Mentor; isMobileModal?: boolean }) {
  const {
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    bookingState,
    setBookingState,
  } = useBookingWidget();

  const handleBooking = () => {
    if (!selectedDate || !selectedSlot) return;
    
    setBookingState("loading");
    
    // Simulate API delay
    setTimeout(() => {
      setBookingState("success");
    }, 1500);
  };

  if (bookingState === "success") {
    return (
      <div className={`bg-white p-8 text-center ${!isMobileModal ? "rounded-3xl border border-green-100 shadow-xl shadow-green-500/5 sticky top-24" : ""}`}>
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Session Confirmed!</h3>
        <p className="text-slate-600 mb-6">
          Your counselling session with {mentor.name.split(' ')[0]} is booked for {selectedDate} at {selectedSlot}.
        </p>
        <button 
          onClick={() => setBookingState("idle")}
          className="w-full py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Book Another Session
        </button>
      </div>
    );
  }

  // Extract available dates for the mock UI
  const availableDates = Object.keys(mentor.availability.slots).sort();
  const displayDates = availableDates.slice(0, 4); // show next 4 available days

  return (
    <div className={`bg-white ${!isMobileModal ? "rounded-3xl p-6 md:p-8 shadow-xl shadow-primary/5 border border-slate-100 sticky top-24" : "p-2"}`}>
      {!isMobileModal && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Book Free Counselling</h3>
          <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-bold rounded-lg uppercase tracking-wider">
            Free
          </span>
        </div>
      )}

      {/* Session Details */}
      <div className="flex flex-col gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
          <Clock className="w-4 h-4 text-slate-400" />
          {mentor.availability.sessionDurationMinutes} Min Session
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
          <Video className="w-4 h-4 text-slate-400" />
          Google Meet
        </div>
      </div>

      {/* Select Date */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-slate-900">Select Date</label>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Globe className="w-3.5 h-3.5" />
            {mentor.availability.timezone}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {displayDates.map((dateStr) => {
            const date = new Date(dateStr);
            const isSelected = selectedDate === dateStr;
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = date.getDate();
            
            return (
              <button
                key={dateStr}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setSelectedSlot(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                  isSelected 
                    ? 'border-primary bg-primary text-white shadow-md' 
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary/30 hover:bg-slate-50'
                }`}
              >
                <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{dayName}</span>
                <span className="text-lg font-bold">{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Select Time Slot */}
      {selectedDate && mentor.availability.slots[selectedDate] && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="text-sm font-bold text-slate-900 mb-3 block">Available Times</label>
          <div className="grid grid-cols-2 gap-2">
            {mentor.availability.slots[selectedDate].map((slot) => {
              const isSelected = selectedSlot === slot.startTime;
              return (
                <button
                  key={slot.id}
                  disabled={!slot.isAvailable}
                  onClick={() => setSelectedSlot(slot.startTime)}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    !slot.isAvailable 
                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                      : isSelected
                        ? 'border-accent bg-accent/10 text-primary'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-accent/50'
                  }`}
                >
                  {slot.startTime}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleBooking}
        disabled={!selectedDate || !selectedSlot || bookingState === 'loading'}
        className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
          selectedDate && selectedSlot && bookingState !== 'loading'
            ? 'bg-linear-to-r from-primary to-indigo-900 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        {bookingState === 'loading' ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Confirming...
          </>
        ) : (
          <>
            Book Session
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
      
      <p className="text-xs text-center text-slate-500 mt-4 font-medium">
        No credit card required. 100% free consultation.
      </p>
    </div>
  );
}

// Minimal check icon since we can't easily import from lucide-react dynamically here without it
function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

