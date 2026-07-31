import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const createResponse = (
  success: boolean,
  message: string,
  data: unknown = null,
  errors: unknown[] = [],
  status: number = 200,
  requestId: string = crypto.randomUUID()
) => {
  return new Response(
    JSON.stringify({
      success,
      message,
      data,
      errors,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        version: "v1",
      },
    }),
    { status, headers: corsHeaders }
  );
};

interface EnrollFreeRequest {
  courseId: string;
}

// Grants enrollment to a free (price = 0/null) published course for the calling student.
// Runs server-side with the service-role key so it can bypass the enrollments table's
// RLS (which intentionally has no student-facing INSERT policy - only admins may write
// there directly; paid-course enrollment goes through the payment verification functions
// instead). This function re-validates the course's price itself rather than trusting the
// client, so a crafted request can't self-grant enrollment to a paid course.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing Supabase configuration");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return createResponse(false, "Unauthorized", null, ["Missing authorization header"], 401, requestId);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: userResp, error: userError } = await callerClient.auth.getUser();
    if (userError || !userResp.user) {
      return createResponse(false, "Unauthorized", null, [userError?.message], 401, requestId);
    }
    const studentId = userResp.user.id;

    const payload = (await req.json()) as EnrollFreeRequest;
    const courseId = payload?.courseId;
    if (!courseId || typeof courseId !== "string") {
      return createResponse(false, "Validation failed", null, ["courseId is required"], 400, requestId);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: course, error: courseError } = await serviceClient
      .from("courses")
      .select("id, price, status")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return createResponse(false, "Course not found", null, [courseError?.message], 404, requestId);
    }

    if (course.status !== "published") {
      return createResponse(false, "Course is not available for enrollment", null, [], 400, requestId);
    }

    if (course.price !== null && Number(course.price) !== 0) {
      return createResponse(false, "This course is not free. Use the checkout flow instead.", null, [], 400, requestId);
    }

    const { data: existing } = await serviceClient
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      return createResponse(true, "Already enrolled", existing, [], 200, requestId);
    }

    const { data: enrollment, error: enrollError } = await serviceClient
      .from("enrollments")
      .insert({
        student_id: studentId,
        course_id: courseId,
        enrollment_source: "purchase",
        status: "active",
      })
      .select()
      .single();

    if (enrollError || !enrollment) {
      throw new Error(enrollError?.message || "Failed to create enrollment");
    }

    await serviceClient.from("audit_logs").insert({
      actor_id: studentId,
      target_id: studentId,
      action: "student_enrolled_free",
      entity_type: "enrollment",
      entity_id: enrollment.id,
      request_id: requestId,
    });

    return createResponse(true, "Enrolled successfully", enrollment, [], 201, requestId);
  } catch (error) {
    console.error("Error in enroll-free function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});
