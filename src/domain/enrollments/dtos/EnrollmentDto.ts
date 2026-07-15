import type { EnrollmentSource, EnrollmentStatus } from "../models/Enrollment";

export interface CreateEnrollmentDto {
  courseId: string;
  studentId: string;
  status?: EnrollmentStatus;
  enrollmentSource?: EnrollmentSource;
  grantedBy?: string | null;
}
