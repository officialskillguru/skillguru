export type EnrollmentSource = "manual" | "purchase" | "coupon" | "scholarship" | "admin" | "mentor" | "system" | "migration";
export type EnrollmentStatus = "active" | "completed" | "dropped" | "suspended";

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  status: EnrollmentStatus;
  enrollmentSource: EnrollmentSource;
  grantedBy: string | null;
  enrolledAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
