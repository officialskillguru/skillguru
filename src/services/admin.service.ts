import { adminRepository, type StudentFilters, type ProfileRow } from "../repositories/admin.repository";
import type { PaginationOptions, PaginatedResponse } from "../repositories/base.repository";
import { type Result, ok, fail, type AppError, UnexpectedError } from "@/utils/result";

export class AdminService {
  async getStudents(filters: StudentFilters, options: PaginationOptions): Promise<Result<PaginatedResponse<ProfileRow>, AppError>> {
    return adminRepository.getStudents(filters, options);
  }

  async updateStudentStatus(studentId: string, status: string): Promise<Result<void, AppError>> {
    return adminRepository.updateStudentStatus(studentId, status);
  }

  async bulkUpdateStudentStatus(studentIds: string[], status: string): Promise<Result<void, AppError>> {
    try {
      // Execute in parallel
      await Promise.all(studentIds.map(id => adminRepository.updateStudentStatus(id, status)));
      return ok(undefined);
    } catch (_error: unknown) {
      return fail(new UnexpectedError("Failed to perform bulk update", "Bulk Update Error", undefined, _error));
    }
  }
}

export const adminService = new AdminService();
