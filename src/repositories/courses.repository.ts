import type { PaginationOptions, PaginatedResponse } from "./base.repository";
import { type Result, ok, fail, type AppError } from "@/utils/result";
import { CoursePersistence } from "@/persistence/course.persistence";
import { mapCourseRowToDomain } from "@/domain/courses/mappers/course.mapper";
import type { Course } from "@/domain/courses/models/Course";
import type { Database } from "@/types/database.types";

export interface CourseFilters {
  query?: string;
  categoryId?: string;
  level?: "beginner" | "intermediate" | "advanced" | "all_levels";
  status?: Database["public"]["Enums"]["course_status"];
}

export type CourseSortOptions = "newest" | "popular" | "highest_rated" | "recommended";

export class CoursesRepository {
  async findById(id: string): Promise<Result<Course, AppError>> {
    const res = await CoursePersistence.getCourseById(id);
    if (!res.success) return fail(res.error);
    return ok(mapCourseRowToDomain(res.data));
  }

  async findBySlug(slug: string): Promise<Result<Course, AppError>> {
    const res = await CoursePersistence.getCourseBySlug(slug);
    if (!res.success) return fail(res.error);
    return ok(mapCourseRowToDomain(res.data));
  }

  async searchCourses(filters: CourseFilters, sort: CourseSortOptions, options: PaginationOptions): Promise<Result<PaginatedResponse<Course>, AppError>> {
    const res = await CoursePersistence.searchCourses(filters, sort, options.page, options.limit);
    if (!res.success) return fail(res.error);

    const { data, count } = res.data;
    
    return ok({
      data: data.map(mapCourseRowToDomain),
      count: count,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(count / options.limit)
    });
  }

  async search(
    query: string,
    options: PaginationOptions
  ): Promise<Result<PaginatedResponse<Course>, AppError>> {
    return this.searchCourses({ query }, "newest", options);
  }
}

export const coursesRepository = new CoursesRepository();
