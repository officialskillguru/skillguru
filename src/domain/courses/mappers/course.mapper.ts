import type { Database } from "@/types/database.types";
import type { Course, CourseLevel, CourseStatus, Module, Lesson, ContentType } from "../models/Course";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];

export function mapCourseRowToDomain(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    level: row.level as CourseLevel,
    status: row.status as CourseStatus,
    price: row.price,
    mentorId: row.mentor_id,
    organizationId: row.organization_id,
    thumbnailFileId: row.thumbnail_file_id,
    promoVideoFileId: row.promo_video_file_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapModuleRowToDomain(row: ModuleRow): Module {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

export function mapLessonRowToDomain(row: LessonRow): Lesson {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    contentType: row.content_type as ContentType,
    durationSeconds: row.duration_seconds,
    isFreePreview: row.is_free_preview,
    sortOrder: row.sort_order,
    textContent: row.text_content,
    videoFileId: row.video_file_id,
  };
}

