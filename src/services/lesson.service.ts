
import { type Result } from "@/utils/result";
import { lessonsRepository } from "@/repositories/lessons.repository";
import type { Database } from "@/types/database.types";
import { type AppError } from "@/utils/result";

type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];

export class LessonService {
  async getLessonDetails(id: string): Promise<Result<LessonRow, AppError>> {
    return lessonsRepository.findOne(id);
  }

  async getCourseModules(courseId: string): Promise<Result<ModuleRow[], AppError>> {
    return lessonsRepository.getCourseModules(courseId);
  }

  async getModuleLessons(moduleId: string): Promise<Result<LessonRow[], AppError>> {
    return lessonsRepository.getModuleLessons(moduleId);
  }

  async getLessonResources(lessonId: string): Promise<Result<ResourceRow[], AppError>> {
    return lessonsRepository.getLessonResources(lessonId);
  }
}

export const lessonService = new LessonService();

