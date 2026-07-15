import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, type AppError, DatabaseError, UnexpectedError } from "@/utils/result";
import { logger } from "@/config/logger";
import type { Database } from "@/types/database.types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
type ProgressRow = Database["public"]["Tables"]["course_progress"]["Row"];

export interface ContinueLearningData {
  course: CourseRow;
  module: ModuleRow | null;
  lesson: LessonRow | null;
  nextLesson: LessonRow | null;
  progress: ProgressRow | null;
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

      // 2. Get progress
      const { data: progressList, error: progressError } = await supabase
        .from("course_progress")
        .select("*")
        .eq("enrollment_id", enrollmentData.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (progressError) return fail(new DatabaseError("Failed to fetch progress", String(progressError), undefined, progressError));
      
      let currentLesson: LessonRow | null = null;
      let currentModule: ModuleRow | null = null;
      let currentProgress: ProgressRow | null = null;

      if (progressList && progressList.length > 0) {
        currentProgress = progressList[0] || null;
      }

      // Progress doesn't track lesson_id in the new schema, so just return the first lesson always for now as a stub
      // If no progress found, we need to find the very first lesson of the course
      if (!currentLesson) {
        const { data: firstModuleData } = await supabase
          .from("modules")
          .select("*")
          .eq("course_id", course.id)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstModuleData) {
          currentModule = firstModuleData;
          const { data: firstLessonData } = await supabase
            .from("lessons")
            .select("*")
            .eq("module_id", firstModuleData.id)
            .order("sort_order", { ascending: true })
            .limit(1)
            .maybeSingle();
            
          if (firstLessonData) {
            currentLesson = firstLessonData;
          }
        }
      }

      // 3. Find next lesson (if current is complete or we just want to know the next)
      let nextLesson: LessonRow | null = null;
      if (currentLesson && currentModule) {
        // Find next lesson in the same module
        const { data: nextInModule } = await supabase
          .from("lessons")
          .select("*")
          .eq("module_id", currentModule.id)
          .gt("sort_order", currentLesson.sort_order)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextInModule) {
          nextLesson = nextInModule;
        } else {
          // Find next module's first lesson
          const { data: nextModule } = await supabase
            .from("modules")
            .select("*")
            .eq("course_id", course.id)
            .gt("sort_order", currentModule.sort_order)
            .order("sort_order", { ascending: true })
            .limit(1)
            .maybeSingle();
            
          if (nextModule) {
            const { data: nextModuleFirstLesson } = await supabase
              .from("lessons")
              .select("*")
              .eq("module_id", nextModule.id)
              .order("sort_order", { ascending: true })
              .limit(1)
              .maybeSingle();
              
            if (nextModuleFirstLesson) {
              nextLesson = nextModuleFirstLesson;
            }
          }
        }
      }

      return ok({
        course,
        module: currentModule,
        lesson: currentLesson,
        nextLesson,
        progress: currentProgress
      });
    } catch (err: unknown) {
      logger.error("ContinueLearningService Error", err);
      return fail(new UnexpectedError("An unexpected error occurred", String(err), undefined, err));
    }
  }
}

export const continueLearningService = new ContinueLearningService();
