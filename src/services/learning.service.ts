
import { type Result } from "@/utils/result";
import { learningRepository, type CourseModuleRow, type LessonRow, type CourseProgressRow, type ResourceRow } from "@/repositories/learning.repository";
import type { AppError } from "@/utils/result";
import type { Database } from "@/types/database.types";

export class LearningService {
  async getCourseModulesWithLessons(courseId: string): Promise<Result<(CourseModuleRow & { lessons: LessonRow[] })[], AppError>> {
    return learningRepository.getCourseModulesWithLessons(courseId);
  }

  async getLessonDetails(lessonId: string): Promise<Result<LessonRow, AppError>> {
    return learningRepository.getLessonDetails(lessonId);
  }

  async getLessonResources(lessonId: string): Promise<Result<ResourceRow[], AppError>> {
    return learningRepository.getLessonResources(lessonId);
  }

  async getStudentProgress(studentId: string, enrollmentId: string): Promise<Result<CourseProgressRow[], AppError>> {
    return learningRepository.getStudentProgress(studentId, enrollmentId);
  }

  async markLessonComplete(
    studentId: string, 
    enrollmentId: string, 
    lessonId: string, 
    watchedSeconds: number = 0
  ): Promise<Result<CourseProgressRow, AppError>> {
    const progress: Database["public"]["Tables"]["course_progress"]["Insert"] = {
      enrollment_id: enrollmentId,
      // lesson tracking is missing from DB, we can only update the overall course progress.
      // this is a stub for now until schema supports lesson progress
      completed_lessons: 1, 
      total_lessons: 10,
      completion_percentage: 10,
      last_activity_at: new Date().toISOString()
    };
    return learningRepository.upsertLessonProgress(progress);
  }
}

export const learningService = new LearningService();

