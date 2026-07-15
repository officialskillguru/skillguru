import { type Result, ok, fail, type AppError, DatabaseError } from "@/utils/result";
import { supabase } from "@/lib/supabase/client";
import { type Database } from "../types/database.types";

export type EnrollmentRow = Database["public"]["Tables"]["enrollments"]["Row"];

export interface IEnrollmentProvider {
  grantEnrollment(
    studentId: string,
    courseId: string,
    source: Database["public"]["Enums"]["enrollment_source"],
    grantedBy?: string
  ): Promise<Result<EnrollmentRow, AppError>>;
}

export class MockEnrollmentProvider implements IEnrollmentProvider {
  async grantEnrollment(
    studentId: string,
    courseId: string,
    source: Database["public"]["Enums"]["enrollment_source"],
    grantedBy?: string
  ): Promise<Result<EnrollmentRow, AppError>> {
    // In Phase A, we simply mock a successful payment/grant by directly inserting the enrollment.
    // In Phase B, this MockEnrollmentProvider will be swapped with FuturePaymentProvider (e.g., Razorpay/Stripe).
    
    const { data, error } = await supabase
      .from("enrollments")
      .insert({
        student_id: studentId,
        course_id: courseId,
        enrollment_source: source,
        granted_by: grantedBy,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return fail(new DatabaseError("Failed to grant enrollment", String(error), undefined, error));
    }

    return ok(data);
  }
}

export class EnrollmentService {
  private provider: IEnrollmentProvider;

  constructor(provider: IEnrollmentProvider = new MockEnrollmentProvider()) {
    this.provider = provider;
  }

  /**
   * Grants an enrollment to a student using the configured provider.
   */
  async grantEnrollment(
    studentId: string,
    courseId: string,
    source: Database["public"]["Enums"]["enrollment_source"],
    grantedBy?: string
  ): Promise<Result<EnrollmentRow, AppError>> {
    return this.provider.grantEnrollment(studentId, courseId, source, grantedBy);
  }
}

export const enrollmentService = new EnrollmentService();
