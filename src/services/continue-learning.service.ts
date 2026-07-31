import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, type AppError, DatabaseError, UnexpectedError } from "@/utils/result";
import { logger } from "@/config/logger";
import { learningRepository } from "@/repositories/learning.repository";
import type { Database } from "@/types/database.types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
type ProgressRow = Database["public"]["Tables"]["course_progress"]["Row"];

export interface ContinueLearningData {
  course: CourseRow;
  mentorName: string | null;
  module: ModuleRow | null;
  lesson: LessonRow | null;
  nextLesson: LessonRow | null;
  progress: ProgressRow | null;
  totalModules: number;
  completedModules: number;
  totalLessons: number;
  completedLessons: number;
}

export class ContinueLearningService {
  async getContinueLearning(studentId: string): Promise<Result<ContinueLearningData | null, AppError>> {
    try {
      // 1. Get latest active enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", studentId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enrollmentError) return fail(new DatabaseError("Failed to fetch latest enrollment", String(enrollmentError), undefined, enrollmentError));
      if (!enrollmentData || !enrollmentData.course_id) return ok(null);

      // Fetch course manually due to missing FK
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", enrollmentData.course_id)
        .single();

      if (courseError || !courseData) return fail(new DatabaseError("Failed to fetch course", String(courseError), undefined, courseError));
      const course = courseData;

      const { data: mentorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", course.mentor_id)
        .maybeSingle();

      // 2. Real curriculum + per-lesson progress - determines the actual
      // lesson the student left off at (previously hardcoded to always the
      // course's first lesson, regardless of real progress).
      const curriculumResult = await learningRepository.getCourseModulesWithLessons(course.id);
      if (!curriculumResult.success) return fail(curriculumResult.error);
      const modules = [...curriculumResult.data].sort((a, b) => a.sort_order - b.sort_order);

      const flatLessons: { lesson: LessonRow; module: ModuleRow }[] = [];
      for (const mod of modules) {
        const sortedLessons = [...mod.lessons].sort((a, b) => a.sort_order - b.sort_order);
        for (const lesson of sortedLessons) {
          flatLessons.push({ lesson, module: mod });
        }
      }

      const { data: lessonProgressRows, error: lessonProgressError } = await supabase
        .from("lesson_progress")
        .select("lesson_id, status")
        .eq("enrollment_id", enrollmentData.id);
      if (lessonProgressError) return fail(new DatabaseError("Failed to fetch lesson progress", String(lessonProgressError), undefined, lessonProgressError));

      const completedLessonIds = new Set(
        (lessonProgressRows ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id)
      );

      const completedModules = modules.filter(
        (mod) => mod.lessons.length > 0 && mod.lessons.every((lesson) => completedLessonIds.has(lesson.id))
      ).length;

      // Resume at the first not-yet-completed lesson; if every lesson is
      // complete, stay on the last one (nextLesson will correctly be null).
      let currentIndex = flatLessons.findIndex(({ lesson }) => !completedLessonIds.has(lesson.id));
      if (currentIndex === -1) currentIndex = flatLessons.length - 1;

      const current = flatLessons[currentIndex] ?? null;
      const next = currentIndex >= 0 ? flatLessons[currentIndex + 1] ?? null : null;

      // 3. Aggregate course-level progress (unchanged - separate rollup table)
      const { data: progressList, error: progressError } = await supabase
        .from("course_progress")
        .select("*")
        .eq("enrollment_id", enrollmentData.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (progressError) return fail(new DatabaseError("Failed to fetch progress", String(progressError), undefined, progressError));
      const currentProgress = progressList && progressList.length > 0 ? progressList[0] ?? null : null;

      return ok({
        course,
        mentorName: mentorProfile?.full_name ?? null,
        module: current?.module ?? null,
        lesson: current?.lesson ?? null,
        nextLesson: next?.lesson ?? null,
        progress: currentProgress,
        totalModules: modules.length,
        completedModules,
        totalLessons: flatLessons.length,
        completedLessons: completedLessonIds.size,
      });
    } catch (err: unknown) {
      logger.error("ContinueLearningService Error", err);
      return fail(new UnexpectedError("An unexpected error occurred", String(err), undefined, err));
    }
  }
}

export const continueLearningService = new ContinueLearningService();
