
import { type Result } from "@/utils/result";
import { learningRepository, type CourseModuleRow, type LessonRow, type ResourceRow } from "@/repositories/learning.repository";
import type { AppError } from "@/utils/result";

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
}

export const learningService = new LearningService();

