import { fail, ok, type Result, ValidationError } from "@/utils/result";
import type { CreateCourseDto } from "../dtos/CourseDto";

export class CourseValidator {
  static validateCreate(dto: CreateCourseDto): Result<CreateCourseDto, ValidationError> {
    if (!dto.title || dto.title.trim() === "") {
      return fail(new ValidationError("Course title is required", "Missing_Title"));
    }
    if (!dto.slug || dto.slug.trim() === "") {
      return fail(new ValidationError("Course slug is required", "Missing_Slug"));
    }
    if (!dto.mentorId) {
      return fail(new ValidationError("Mentor ID is required", "Missing_MentorId"));
    }
    return ok(dto);
  }
}
