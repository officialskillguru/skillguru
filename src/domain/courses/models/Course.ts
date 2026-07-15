export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type CourseStatus = "draft" | "published" | "archived";

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: CourseLevel;
  status: CourseStatus;
  mentorId: string;
  organizationId: string | null;
  thumbnailFileId: string | null;
  promoVideoFileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
}

export type ContentType = "video" | "text" | "quiz";

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  contentType: ContentType;
  durationSeconds: number | null;
  isFreePreview: boolean;
  sortOrder: number;
  textContent: string | null;
  videoFileId: string | null;
}

