import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAvailableSlots, bookSession } from "@/services/mentor-booking.service";

export type SlotOption = { iso: string; endIso: string; label: string };

const DAYS_AHEAD = 14;

export function useBookingWidget(mentorId: string) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const end = new Date(today.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
    return { startDate: today.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  }, []);

  const slotsQuery = useQuery({
    queryKey: ["mentor-booking", "slots", mentorId, startDate, endDate],
    queryFn: () => getAvailableSlots(mentorId, startDate, endDate),
    enabled: !!mentorId,
  });

  const slotsByDate = useMemo(() => {
    const map: Record<string, SlotOption[]> = {};
    for (const slot of slotsQuery.data ?? []) {
      const dateKey = slot.slotStart.slice(0, 10);
      const label = new Date(slot.slotStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      (map[dateKey] ??= []).push({ iso: slot.slotStart, endIso: slot.slotEnd, label });
    }
    return map;
  }, [slotsQuery.data]);

  const bookMutation = useMutation({
    mutationFn: () => {
      const slot = (selectedDate ? slotsByDate[selectedDate] : undefined)?.find((s) => s.iso === selectedSlot);
      if (!slot) throw new Error("Selected slot is no longer available. Please pick another.");
      return bookSession(mentorId, slot.iso, slot.endIso);
    },
    onMutate: () => {
      setBookingState("loading");
      setError(null);
    },
    onSuccess: () => {
      setBookingState("success");
      void queryClient.invalidateQueries({ queryKey: ["mentor-booking", "slots", mentorId] });
    },
    onError: (err: unknown) => {
      setBookingState("error");
      setError(err instanceof Error ? err.message : "Failed to book session");
    },
  });

  const resetSelection = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setBookingState("idle");
    setError(null);
  };

  return {
    isLoadingSlots: slotsQuery.isLoading,
    slotsByDate,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    bookingState,
    error,
    book: () => bookMutation.mutate(),
    resetSelection,
  };
}
