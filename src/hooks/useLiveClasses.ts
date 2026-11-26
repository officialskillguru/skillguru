import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMentorLiveClasses,
  listStudentLiveClasses,
  listCourseLiveClasses,
  getLiveClass,
  createLiveClass,
  cancelLiveClass,
  groupLiveClasses,
  getPublicCourseSchedule,
  startLiveClass,
  endLiveClass,
  joinLiveClass,
  getLiveClassRoster,
  listLiveClassMessages,
  sendLiveClassMessage,
  type CreateLiveClassInput,
} from "@/services/live-classes.service";

/**
 * Class status changes (teacher starts/ends a class) reach other panels by
 * polling: lists every 5 s, an open room every 4 s. No realtime channel is
 * required, so this works the same on the local simulation stack and hosted.
 */
const LIST_POLL_MS = 5_000;
const ROOM_POLL_MS = 4_000;

export function useMentorLiveClasses() {
  const query = useQuery({
    queryKey: ["mentor-live-classes"],
    queryFn: listMentorLiveClasses,
    refetchInterval: LIST_POLL_MS,
  });
  return { ...query, grouped: query.data ? groupLiveClasses(query.data) : undefined };
}

export function useStudentLiveClasses() {
  const query = useQuery({
    queryKey: ["student-live-classes"],
    queryFn: listStudentLiveClasses,
    refetchInterval: LIST_POLL_MS,
  });
  return { ...query, grouped: query.data ? groupLiveClasses(query.data) : undefined };
}

export function useCourseLiveClasses(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-live-classes", courseId],
    queryFn: () => listCourseLiveClasses(courseId!),
    enabled: !!courseId,
    refetchInterval: LIST_POLL_MS,
  });
}

export function useLiveClass(id: string | undefined, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: ["live-class", id],
    queryFn: () => getLiveClass(id!),
    enabled: !!id,
    refetchInterval: options.poll ? ROOM_POLL_MS : false,
  });
}

/** Server-side room entry (records attendance for students). Retried while the class is still scheduled. */
export function useJoinLiveClass(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["live-class-join", id],
    queryFn: () => joinLiveClass(id!),
    enabled: !!id && enabled,
    retry: false,
    staleTime: Infinity,
  });
}

export function useLiveClassRoster(id: string | undefined, options: { enabled?: boolean; poll?: boolean } = {}) {
  return useQuery({
    queryKey: ["live-class-roster", id],
    queryFn: () => getLiveClassRoster(id!),
    enabled: !!id && (options.enabled ?? true),
    refetchInterval: options.poll ? ROOM_POLL_MS : false,
  });
}

export function useLiveClassMessages(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["live-class-messages", id],
    queryFn: () => listLiveClassMessages(id!),
    enabled: !!id && enabled,
    refetchInterval: 3_000,
  });
}

export function useSendLiveClassMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendLiveClassMessage(id, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["live-class-messages", id] }),
  });
}

export function useLiveClassMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["mentor-live-classes"] });
    void queryClient.invalidateQueries({ queryKey: ["student-live-classes"] });
    void queryClient.invalidateQueries({ queryKey: ["course-live-classes"] });
    void queryClient.invalidateQueries({ queryKey: ["course-schedule"] });
    void queryClient.invalidateQueries({ queryKey: ["live-class"] });
  };

  const create = useMutation({
    mutationFn: (input: CreateLiveClassInput) => createLiveClass(input),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelLiveClass(id),
    onSuccess: invalidate,
  });

  const start = useMutation({
    mutationFn: (id: string) => startLiveClass(id),
    onSuccess: invalidate,
  });

  const end = useMutation({
    mutationFn: (id: string) => endLiveClass(id),
    onSuccess: invalidate,
  });

  return { create, cancel, start, end };
}

/** Public schedule for a published course (course detail page, checkout). */
export function useCourseSchedule(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-schedule", courseId],
    queryFn: () => getPublicCourseSchedule(courseId!),
    enabled: !!courseId,
  });
}
