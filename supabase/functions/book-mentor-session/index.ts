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

interface BookSessionRequest {
  mentorId: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
}

// Creates a real, persistent mentorship session booking (a row in `meetings`).
// Runs server-side with the service-role key because `meetings` intentionally
// has no student-facing INSERT policy (only host/admin) - this function
// re-validates the requested slot is actually free (via the same logic backing
// get_mentor_available_slots) before inserting, so a crafted request can't
// double-book or book outside the mentor's real availability. Mirrors the
// enroll-free function's pattern for the same class of problem (enrollments).
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

    const payload = (await req.json()) as BookSessionRequest;
    const { mentorId, startTime, endTime } = payload ?? {};

    if (!mentorId || typeof mentorId !== "string") {
      return createResponse(false, "Validation failed", null, ["mentorId is required"], 400, requestId);
    }
    const starts = new Date(startTime);
    const ends = new Date(endTime);
    if (!startTime || !endTime || Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) {
      return createResponse(false, "Validation failed", null, ["startTime/endTime must be a valid range"], 400, requestId);
    }
    if (starts.getTime() < Date.now()) {
      return createResponse(false, "Cannot book a slot in the past", null, [], 400, requestId);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: mentor, error: mentorError } = await serviceClient
      .from("mentor_profiles")
      .select("id")
      .eq("id", mentorId)
      .maybeSingle();

    if (mentorError || !mentor) {
      return createResponse(false, "Mentor not found", null, [mentorError?.message], 404, requestId);
    }

    // Re-validate the slot is actually free: same conflict-check the
    // get_mentor_available_slots RPC performs, run directly here so we can
    // check an exact requested range rather than only the RPC's fixed grid.
    const dayOfWeek = starts.getUTCDay();
    const { data: availabilityRows, error: availabilityError } = await serviceClient
      .from("availability")
      .select("start_time, end_time")
      .eq("user_id", mentorId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("day_of_week", dayOfWeek);

    if (availabilityError) {
      throw new Error(availabilityError.message);
    }

    const startHms = starts.toISOString().slice(11, 19);
    const endHms = ends.toISOString().slice(11, 19);
    const withinAvailability = (availabilityRows ?? []).some(
      (row) => row.start_time <= startHms && row.end_time >= endHms
    );
    if (!withinAvailability) {
      return createResponse(false, "This slot is outside the mentor's availability", null, [], 400, requestId);
    }

    const { data: conflicts, error: conflictError } = await serviceClient
      .from("meetings")
      .select("id")
      .eq("host_id", mentorId)
      .neq("status", "cancelled")
      .lt("starts_at", ends.toISOString())
      .gt("ends_at", starts.toISOString())
      .limit(1);

    if (conflictError) {
      throw new Error(conflictError.message);
    }
    if (conflicts && conflicts.length > 0) {
      return createResponse(false, "This slot was just booked by someone else. Please pick another.", null, [], 409, requestId);
    }

    const { data: meeting, error: insertError } = await serviceClient
      .from("meetings")
      .insert({
        title: "Mentorship Session",
        host_id: mentorId,
        attendee_id: studentId,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: "scheduled",
        platform: "google_meet",
      })
      .select()
      .single();

    if (insertError || !meeting) {
      throw new Error(insertError?.message || "Failed to create booking");
    }

    // Notify the mentor - non-blocking, booking already succeeded above.
    try {
      await serviceClient.from("notifications").insert({
        recipient_id: mentorId,
        sender_id: studentId,
        type: "session_booked",
        title: "New session booked",
        message: `A student booked a mentorship session with you on ${starts.toLocaleString()}.`,
        is_read: false,
        metadata: { meeting_id: meeting.id, category: "message" },
      });
    } catch (notifyError) {
      console.error("Failed to send booking notification:", notifyError);
    }

    return createResponse(true, "Session booked successfully", meeting, [], 201, requestId);
  } catch (error) {
    console.error("Error in book-mentor-session function:", error);
    return createResponse(false, "Internal Server Error", null, [(error as Error).message], 500, requestId);
  }
});
