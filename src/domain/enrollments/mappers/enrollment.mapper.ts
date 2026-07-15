import type { Database } from "@/types/database.types";
import type { Enrollment, EnrollmentSource, EnrollmentStatus } from "../models/Enrollment";

type EnrollmentRow = Database["public"]["Tables"]["enrollments"]["Row"];

export function mapEnrollmentRowToDomain(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    status: row.status as EnrollmentStatus,
    enrollmentSource: row.enrollment_source,
    grantedBy: row.granted_by,
    enrolledAt: row.enrolled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
