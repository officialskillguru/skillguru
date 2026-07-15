import { type Result, ok, fail, type AppError, DatabaseError } from "@/utils/result";
import { EnrollmentPersistence } from "@/persistence/enrollment.persistence";
import { CoursePersistence } from "@/persistence/course.persistence";
import { mapEnrollmentRowToDomain } from "@/domain/enrollments/mappers/enrollment.mapper";
import { mapCourseRowToDomain } from "@/domain/courses/mappers/course.mapper";
import type { Enrollment } from "@/domain/enrollments/models/Enrollment";
import type { Course } from "@/domain/courses/models/Course";
import type { PaginationOptions, PaginatedResponse } from "./base.repository";

export class EnrollmentsRepository {
  async getEnrolledCourses(studentId: string, options: PaginationOptions): Promise<Result<PaginatedResponse<Enrollment & { courses: Course | null }>, AppError>> {
    const enrollmentsRes = await EnrollmentPersistence.getEnrollmentsByStudent(studentId, options.page, options.limit);
    if (!enrollmentsRes.success) return fail(enrollmentsRes.error);

    const { data: enrollmentsData, count } = enrollmentsRes.data;

    // Fetch related courses
    const courseIds = Array.from(new Set(enrollmentsData.map(e => e.course_id).filter(Boolean)));
    let coursesData: Course[] = [];
    if (courseIds.length > 0) {
      // For now we will fetch courses manually using CoursePersistence which lacks an IN query, 
      // but we can add an IN query to CoursePersistence.
      const promises = courseIds.map(id => CoursePersistence.getCourseById(id));
      const results = await Promise.all(promises);
      coursesData = results.filter((r): r is Extract<typeof r, { success: true }> => r.success).map(r => r.data).map(mapCourseRowToDomain);
    }

    const mergedData = enrollmentsData.map(enrollment => ({
      ...mapEnrollmentRowToDomain(enrollment),
      courses: coursesData.find(c => c.id === enrollment.course_id) || null
    }));

    return ok({
      data: mergedData,
      count: count,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(count / options.limit)
    });
  }
}

export const enrollmentsRepository = new EnrollmentsRepository();
