import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMentorLiveClasses,
  listStudentLiveClasses,
  getLiveClass,
  createLiveClass,
  cancelLiveClass,
  groupLiveClasses,
  type CreateLiveClassInput,
} from "@/services/live-classes.service";

export function useMentorLiveClasses() {
  const query = useQuery({
    queryKey: ["mentor-live-classes"],
    queryFn: listMentorLiveClasses,
  });
  return { ...query, grouped: query.data ? groupLiveClasses(query.data) : undefined };
}

export function useStudentLiveClasses() {
  const query = useQuery({
    queryKey: ["student-live-classes"],
    queryFn: listStudentLiveClasses,
  });
  return { ...query, grouped: query.data ? groupLiveClasses(query.data) : undefined };
}

export function useLiveClass(id: string | undefined) {
  return useQuery({
    queryKey: ["live-class", id],
    queryFn: () => getLiveClass(id!),
    enabled: !!id,
  });
}

export function useLiveClassMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["mentor-live-classes"] });
    void queryClient.invalidateQueries({ queryKey: ["student-live-classes"] });
  };

  const create = useMutation({
    mutationFn: (input: CreateLiveClassInput) => createLiveClass(input),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelLiveClass(id),
    onSuccess: invalidate,
  });

  return { create, cancel };
}
