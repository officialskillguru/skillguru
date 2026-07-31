import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { listMyNotes, getNoteForLesson, saveNote, deleteNote } from "@/services/notes.service";

export function useMyNotes() {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: ["lesson-notes", "mine", studentId],
    queryFn: () => listMyNotes(studentId ?? ""),
    enabled: !!studentId,
  });
}

export function useLessonNote(lessonId: string | undefined) {
  const { user } = useAuth();
  const studentId = user?.id;
  return useQuery({
    queryKey: ["lesson-notes", "for-lesson", studentId, lessonId],
    queryFn: () => getNoteForLesson(studentId ?? "", lessonId ?? ""),
    enabled: !!studentId && !!lessonId,
  });
}

export function useSaveLessonNote(courseId: string | undefined, lessonId: string | undefined) {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => {
      if (!studentId || !courseId || !lessonId) throw new Error("Missing note context");
      return saveNote({ student_id: studentId, course_id: courseId, lesson_id: lessonId, content });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson-notes", "for-lesson", studentId, lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["lesson-notes", "mine", studentId] });
    },
  });
}

export function useDeleteNote() {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lesson-notes"], });
      void queryClient.invalidateQueries({ queryKey: ["lesson-notes", "mine", studentId] });
    },
  });
}
