import { type Result, ok, fail, type AppError, DatabaseError } from "@/utils/result";
import { supabase } from "@/lib/supabase/client";
import { type Database } from "../types/database.types";

interface EnrollFreeResponse {
  success: boolean;
  message: string;
  data: EnrollmentRow | null;
  errors: unknown[];
}

/**
 * Grants enrollment in a free (price 0/null) published course via the `enroll-free`
 * Edge Function. Runs server-side with the service-role key because `enrollments` has
 * no student-facing INSERT policy - only admins may write there directly - so this
 * cannot be done as a direct client-side insert (see MockEnrollmentProvider below,
 * which is why it's unused).
 */
export async function enrollInFreeCourse(courseId: string): Promise<Result<EnrollmentRow, AppError>> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<EnrollFreeResponse>("enroll-free", {
    body: { courseId },
  });

  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- see above
    return fail(new DatabaseError(error.message, "enroll_free_invoke_failed"));
  }
  if (!data?.success || !data.data) {
    return fail(new DatabaseError(data?.message ?? "Failed to enroll", "enroll_free_failed"));
  }
  return ok(data.data);
}

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
