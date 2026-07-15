import { fail, ok, type Result, ValidationError } from "@/utils/result";
import type { CreateEnrollmentDto } from "../dtos/EnrollmentDto";

export class EnrollmentValidator {
  static validateCreate(dto: CreateEnrollmentDto): Result<CreateEnrollmentDto, ValidationError> {
    if (!dto.courseId) {
      return fail(new ValidationError("Course ID is required", "Missing_CourseId"));
    }
    if (!dto.studentId) {
      return fail(new ValidationError("Student ID is required", "Missing_StudentId"));
    }
    return ok(dto);
  }
}
