export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
export type CourseStatus = "draft" | "under_review" | "published" | "archived";

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  level: CourseLevel;
  status: CourseStatus;
  price: number | null;
  discountPrice: number | null;
  duration: string | null;
  language: string;
  courseType: string | null;
  whatYouWillLearn: string[];
  requirements: string[];
  mentorId: string;
  organizationId: string | null;
  thumbnailFileId: string | null;
  bannerFileId: string | null;
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

