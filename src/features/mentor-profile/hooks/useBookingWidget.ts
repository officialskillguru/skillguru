import { useState } from "react";

export function useBookingWidget() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<"Online" | "Offline">("Online");
  const [bookingState, setBookingState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const resetSelection = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setBookingState("idle");
    setError(null);
  };

  return {
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    sessionType,
    setSessionType,
    bookingState,
    setBookingState,
    error,
    setError,
    resetSelection,
  };
}
