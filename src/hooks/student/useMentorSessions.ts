import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { listMyUpcomingBookings, cancelBooking, type MeetingRow } from "@/services/mentor-booking.service";
import { getSupabaseClientOrThrow } from "@/services/_shared";

export type MyMentorSession = MeetingRow & { mentorName: string | null };

const sessionsKey = (studentId: string) => ["student", "mentor-sessions", studentId] as const;

export function useMyMentorSessions() {
  const { user } = useAuth();
  const studentId = user?.id;

  return useQuery({
    queryKey: sessionsKey(studentId ?? ""),
    queryFn: async (): Promise<MyMentorSession[]> => {
      const sessions = await listMyUpcomingBookings(studentId ?? "");
      if (sessions.length === 0) return [];

      const hostIds = Array.from(new Set(sessions.map((s) => s.host_id)));
      const supabase = getSupabaseClientOrThrow();
      const { data: mentors } = await supabase.rpc("get_public_mentor_profiles", { p_mentor_ids: hostIds });
      const nameByHostId = new Map((mentors ?? []).map((m) => [m.id, m.full_name]));

      return sessions.map((s) => ({ ...s, mentorName: nameByHostId.get(s.host_id) ?? null }));
    },
    enabled: !!studentId,
  });
}

export function useCancelMyMentorSession() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => cancelBooking(meetingId),
    onSuccess: () => {
      if (studentId) void queryClient.invalidateQueries({ queryKey: sessionsKey(studentId) });
    },
  });
}
