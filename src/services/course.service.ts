import { type Result } from "@/utils/result";
import { coursesRepository, type CourseFilters, type CourseSortOptions } from "@/repositories/courses.repository";
import { enrollmentsRepository } from "@/repositories/enrollments.repository";
import type { PaginationOptions, PaginatedResponse } from "@/repositories/base.repository";
import { type AppError } from "@/utils/result";
import type { Course } from "@/domain/courses/models/Course";
import type { Enrollment } from "@/domain/enrollments/models/Enrollment";

export class CourseService {
  async getCourseDetails(id: string): Promise<Result<Course, AppError>> {
    // Note: findOne is not available on CoursesRepository. Using findById if we add it, else it should be implemented
    // For now we will use an imaginary getCourseById that will be added to CoursesRepository later
    return coursesRepository.findById(id);
  }

  async getEnrolledCourses(studentId: string, options: PaginationOptions): Promise<Result<PaginatedResponse<Enrollment & { courses: Course | null }>, AppError>> {
    return enrollmentsRepository.getEnrolledCourses(studentId, options);
  }

  async searchCourses(filters: CourseFilters, sort: CourseSortOptions, options: PaginationOptions): Promise<Result<PaginatedResponse<Course>, AppError>> {
    return coursesRepository.searchCourses(filters, sort, options);
  }

  async getCourseBySlug(slug: string): Promise<Result<Course, AppError>> {
    return coursesRepository.findBySlug(slug);
  }
}

export const courseService = new CourseService();
