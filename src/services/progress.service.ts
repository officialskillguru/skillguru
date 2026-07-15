
import { type Result, ok, fail, AppError } from "@/utils/result";
import { progressRepository, type LessonProgressRow } from "@/repositories/progress.repository";
import { logger } from "@/config/logger";

export class ProgressService {
  async markLessonComplete(enrollmentId: string, lessonId: string): Promise<Result<LessonProgressRow, AppError>> {
    try {
      const progressResult = await progressRepository.upsertLessonProgress({
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        status: "completed",
        completed_at: new Date().toISOString()
      });

      if (!progressResult.success) return progressResult as any; // Cast for now, will map properly if needed
      return ok(progressResult.data);
    } catch (err: unknown) {
      logger.error("ProgressService Error", err);
      return fail(new AppError("An unexpected error occurred", "UNEXPECTED_ERROR", String(err)));
    }
  }

  async updateWatchedSeconds(enrollmentId: string, lessonId: string, seconds: number): Promise<Result<LessonProgressRow, AppError>> {
    const result = await progressRepository.upsertLessonProgress({
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      video_position_seconds: seconds,
      status: "started"
    });
    return result as any; // Map return type properly 
  }
}

export const progressService = new ProgressService();

