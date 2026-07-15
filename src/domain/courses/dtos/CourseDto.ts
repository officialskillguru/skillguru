import type { CourseLevel, CourseStatus } from "../models/Course";

export interface CreateCourseDto {
  title: string;
  slug: string;
  description?: string | null;
  level: CourseLevel;
  status: CourseStatus;
  mentorId: string;
  organizationId?: string | null;
  thumbnailFileId?: string | null;
  promoVideoFileId?: string | null;
}

export interface UpdateCourseDto {
  title?: string;
  slug?: string;
  description?: string | null;
  level?: CourseLevel;
  status?: CourseStatus;
  thumbnailFileId?: string | null;
  promoVideoFileId?: string | null;
}
