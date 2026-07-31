import { getExtendedSupabaseClient, normalizeSearchTerm } from "./_shared";
import { type Result, ok, fail, DatabaseError } from "@/utils/result";

// ============================================================================
// Types
// ============================================================================
export interface MentorInvite {
  id: string;
  email: string;
  full_name: string;
  invited_by: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  message: string | null;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string;
  user_id: string | null;
}

// ============================================================================
// Mentor Invite Service
// ============================================================================
export const mentorInviteService = {
  // --------------------------------------------------------------------------
  // Admin: Create mentor account
  // --------------------------------------------------------------------------
  async inviteMentor(
    email: string,
    fullName: string,
    message?: string
  ): Promise<Result<MentorInvite>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      // Check if already invited/exists
      const { data: existing } = await supabase
        .from("mentor_invites")
        .select("id, status")
        .eq("email", email)
        .in("status", ["pending"])
        .maybeSingle();

      if (existing) {
        return fail(new DatabaseError(`An active invitation already exists for ${email}`, "invite_exists"));
      }

      // Check if user already exists in system
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        // User already has an account — assign mentor role instead
        const { data: mentorRole } = await supabase
          .from("roles")
          .select("id")
          .eq("code", "mentor")
          .single();

        if (mentorRole) {
          await supabase.from("user_roles").insert({
            user_id: (existingProfile as { id: string }).id,
            role_id: (mentorRole).id,
          } as never).select().maybeSingle(); // ignore conflict

          // Create mentor_profile if not exists
          await supabase.from("mentor_profiles").insert({
            profile_id: (existingProfile as { id: string }).id,
            headline: "Mentor",
            bio: "",
          } as never).maybeSingle();
        }

        return fail(new DatabaseError(
          `User ${email} already exists. Mentor role has been assigned to their account.`,
          "user_exists"
        ));
      }

      // Create the invite record first
      const { data: invite, error: inviteErr } = await supabase
        .from("mentor_invites")
        .insert({
          email,
          full_name: fullName,
          invited_by: user.id,
          status: "pending",
          message: message ?? null,
        } as never)
        .select()
        .single();

      if (inviteErr) return fail(new DatabaseError(inviteErr.message, inviteErr.code));

      // Call the real, deployed create-mentor Edge Function to provision the auth user.
      // (This previously called a nonexistent "create-mentor-account" function — every invite silently failed to provision an account.)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
      const { data: createResult, error: createErr } = await supabase.functions.invoke<{
        success: boolean;
        message: string;
        data: { id: string; email: string; fullName: string } | null;
      }>("create-mentor", {
        body: { fullName, email, onboardingMethod: "invite" },
      });

      if (createErr || !createResult?.success) {
        // If Edge Function unavailable/fails, mark invite as pending and show credentials approach
        console.warn("[MentorInvite] create-mentor failed:", createErr instanceof Error ? createErr.message : createResult?.message ?? String(createErr));
        console.info("[MentorInvite] Invite record created, mentor must use password reset to activate.");
      } else if (createResult.data) {
        // Update invite with the created user ID
        await supabase
          .from("mentor_invites")
          .update({ user_id: createResult.data.id })
          .eq("id", (invite as MentorInvite).id);
      }

      return ok(invite as MentorInvite);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "mentor_invite_create"));
    }
  },

  // --------------------------------------------------------------------------
  // List all invites (admin)
  // --------------------------------------------------------------------------
  async listInvites(): Promise<Result<MentorInvite[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase
        .from("mentor_invites")
        .select("*")
        .order("invited_at", { ascending: false });

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok((data as MentorInvite[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "mentor_invites_list"));
    }
  },

  // --------------------------------------------------------------------------
  // Cancel invite
  // --------------------------------------------------------------------------
  async cancelInvite(inviteId: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase
        .from("mentor_invites")
        .update({ status: "cancelled" } as never)
        .eq("id", inviteId);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "mentor_invite_cancel"));
    }
  },

  // --------------------------------------------------------------------------
  // Resend invite
  // --------------------------------------------------------------------------
  async resendInvite(inviteId: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();

      const { data: inviteRow, error: getErr } = await supabase
        .from("mentor_invites")
        .select("*")
        .eq("id", inviteId)
        .single();

      if (getErr) return fail(new DatabaseError(getErr.message, getErr.code));
      const invite = inviteRow as MentorInvite;

      // Extend expiry
      await supabase
        .from("mentor_invites")
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
        } as never)
        .eq("id", inviteId);

      if (invite.user_id) {
        // Account already provisioned on a prior attempt — create-mentor isn't idempotent
        // (it 409s on an existing email), so "resend" here means forcing a fresh password reset instead.
        await supabase
          .from("user_settings")
          .update({ password_reset_required: true })
          .eq("user_id", invite.user_id);
      } else {
        // No account exists yet (first attempt never succeeded) — provision it for real now.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
        const { data: createResult, error: createErr } = await supabase.functions.invoke<{
          success: boolean;
          message: string;
          data: { id: string; email: string; fullName: string } | null;
        }>("create-mentor", {
          body: { fullName: invite.full_name, email: invite.email, onboardingMethod: "invite" },
        });

        if (createErr || !createResult?.success) {
          return fail(new DatabaseError(createErr instanceof Error ? createErr.message : createResult?.message ?? "Failed to provision mentor account", "mentor_invite_resend_provision"));
        }
        if (createResult.data) {
          await supabase.from("mentor_invites").update({ user_id: createResult.data.id }).eq("id", inviteId);
        }
      }

      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "mentor_invite_resend"));
    }
  },
};

// ============================================================================
// Analytics Service
// ============================================================================
export interface RevenueChartPoint {
  month: string;
  revenue: number;
  refunds: number;
  net: number;
}

export interface EnrollmentChartPoint {
  month: string;
  enrollments: number;
  completions: number;
}

export const analyticsService = {
  async getRevenueChart(months = 12): Promise<Result<RevenueChartPoint[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status, created_at")
        .eq("status", "completed")
        .gte("created_at", since.toISOString());

      const { data: refunds } = await supabase
        .from("refunds")
        .select("amount, created_at")
        .eq("status", "processed")
        .gte("created_at", since.toISOString());

      const monthMap = new Map<string, { revenue: number; refunds: number }>();

      (payments ?? []).forEach((p: { amount: number; created_at: string }) => {
        const key = new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const existing = monthMap.get(key) ?? { revenue: 0, refunds: 0 };
        monthMap.set(key, { ...existing, revenue: existing.revenue + Number(p.amount) });
      });

      (refunds ?? []).forEach((r: { amount: number; created_at: string }) => {
        const key = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const existing = monthMap.get(key) ?? { revenue: 0, refunds: 0 };
        monthMap.set(key, { ...existing, refunds: existing.refunds + Number(r.amount) });
      });

      const result = Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        refunds: data.refunds,
        net: data.revenue - data.refunds,
      }));

      return ok(result);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "analytics_revenue_chart"));
    }
  },

  async getEnrollmentChart(months = 12): Promise<Result<EnrollmentChartPoint[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("status, enrolled_at, completed_at")
        .gte("enrolled_at", since.toISOString());

      const monthMap = new Map<string, { enrollments: number; completions: number }>();

      (enrollments ?? []).forEach((e: { status: string; enrolled_at: string; completed_at: string | null }) => {
        const key = new Date(e.enrolled_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const existing = monthMap.get(key) ?? { enrollments: 0, completions: 0 };
        monthMap.set(key, {
          enrollments: existing.enrollments + 1,
          completions: existing.completions + (e.status === "completed" ? 1 : 0),
        });
      });

      const result = Array.from(monthMap.entries()).map(([month, data]) => ({ month, ...data }));
      return ok(result);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "analytics_enrollment_chart"));
    }
  },

  async getTopCourses(limit = 10): Promise<Result<{ id: string; title: string; enrollments: number; revenue: number; completionRate: number }[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data } = await supabase
        .from("enrollments")
        .select("course_id, status, courses(id, title)")
        .neq("status", "cancelled");

      if (!data) return ok([]);

      const courseMap = new Map<string, { title: string; enrollments: number; completions: number }>();
      (data as unknown as { course_id: string; status: string; courses: { id: string; title: string } | null }[]).forEach((e) => {
        const id = e.course_id;
        const existing = courseMap.get(id) ?? { title: e.courses?.title ?? "Unknown", enrollments: 0, completions: 0 };
        courseMap.set(id, {
          ...existing,
          enrollments: existing.enrollments + 1,
          completions: existing.completions + (e.status === "completed" ? 1 : 0),
        });
      });

      // Real revenue per course: sum of order_items.price for orders that actually completed payment.
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("course_id, price, orders!inner(status)")
        .eq("orders.status", "completed");

      const revenueMap = new Map<string, number>();
      (orderItems as unknown as { course_id: string; price: number }[] ?? []).forEach((oi) => {
        revenueMap.set(oi.course_id, (revenueMap.get(oi.course_id) ?? 0) + Number(oi.price));
      });

      const result = Array.from(courseMap.entries())
        .map(([id, d]) => ({
          id,
          title: d.title,
          enrollments: d.enrollments,
          revenue: revenueMap.get(id) ?? 0,
          completionRate: d.enrollments > 0 ? Math.round((d.completions / d.enrollments) * 100) : 0,
        }))
        .sort((a, b) => b.enrollments - a.enrollments)
        .slice(0, limit);

      return ok(result);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "analytics_top_courses"));
    }
  },

  async getStudentGrowth(months = 12): Promise<Result<{ month: string; students: number; cumulative: number }[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since.toISOString());

      const monthMap = new Map<string, number>();
      (data ?? []).forEach((p: { created_at: string }) => {
        const key = new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
      });

      let cumulative = 0;
      const result = Array.from(monthMap.entries()).map(([month, count]) => {
        cumulative += count;
        return { month, students: count, cumulative };
      });

      return ok(result);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "analytics_student_growth"));
    }
  },

  async getLeadConversionChart(): Promise<Result<{ status: string; count: number; percentage: number }[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data } = await supabase
        .from("leads")
        .select("status")
        .is("deleted_at", null);

      if (!data) return ok([]);

      const total = data.length;
      const statusMap = new Map<string, number>();
      (data as { status: string }[]).forEach((l) => {
        statusMap.set(l.status, (statusMap.get(l.status) ?? 0) + 1);
      });

      const result = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

      return ok(result);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "analytics_lead_conversion"));
    }
  },
};

// ============================================================================
// Support Service
// ============================================================================
export interface SupportTicket {
  id: string;
  student_id: string;
  assigned_to: string | null;
  category: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  student?: { full_name: string; email: string } | null;
  assigned?: { full_name: string } | null;
  message_count?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  author?: { full_name: string } | null;
}

export const supportService = {
  async listTickets(filters: { status?: string; priority?: string; search?: string } = {}): Promise<Result<SupportTicket[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      let query = supabase
        .from("support_tickets")
        .select(`
          *,
          student:profiles!support_tickets_student_id_fkey(full_name, email),
          assigned:profiles!support_tickets_assigned_to_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.priority) query = query.eq("priority", filters.priority);
      const search = normalizeSearchTerm(filters.search);
      if (search) {
        query = query.or(`title.ilike.${search},description.ilike.${search}`);
      }

      const { data, error } = await query;
      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok((data as SupportTicket[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "support_tickets_list"));
    }
  },

  async getTicket(id: string): Promise<Result<SupportTicket>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          student:profiles!support_tickets_student_id_fkey(full_name, email),
          assigned:profiles!support_tickets_assigned_to_fkey(full_name)
        `)
        .eq("id", id)
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(data as SupportTicket);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "support_ticket_get"));
    }
  },

  async createTicket(ticket: { title: string; description: string; category: string; priority: string }): Promise<Result<SupportTicket>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({ ...ticket, student_id: user.id } as never)
        .select()
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(data as SupportTicket);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "support_ticket_create"));
    }
  },

  async updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status,
          ...(assignedTo && { assigned_to: assignedTo }),
          ...(status === "resolved" && { resolved_at: new Date().toISOString() }),
        } as never)
        .eq("id", id);

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "support_ticket_update"));
    }
  },

  async getTicketMessages(ticketId: string): Promise<Result<TicketMessage[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*, author:profiles!ticket_messages_author_id_fkey(full_name)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok((data as TicketMessage[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "support_ticket_messages"));
    }
  },

  async addTicketMessage(ticketId: string, content: string, isInternal = false): Promise<Result<TicketMessage>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      const { data, error } = await supabase
        .from("ticket_messages")
        .insert({ ticket_id: ticketId, author_id: user.id, content, is_internal: isInternal } as never)
        .select("*, author:profiles!ticket_messages_author_id_fkey(full_name)")
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(data as TicketMessage);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "support_message_add"));
    }
  },
};

// ============================================================================
// Calendar Service
// ============================================================================
export interface CalendarEvent {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  entity_type: string | null;
  entity_id: string | null;
  color: string | null;
  created_at: string;
}

interface CalendarEventRow {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string;
  is_all_day: boolean;
  entity_type: string | null;
  entity_id: string | null;
  color: string | null;
  created_at: string;
}

function rowToCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return { ...row, all_day: row.is_all_day };
}

async function getOrCreateUserCalendarId(supabase: ReturnType<typeof getExtendedSupabaseClient>, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("calendars")
    .select("id")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return (existing).id;

  const { data: created, error } = await supabase
    .from("calendars")
    .insert({ user_id: userId, name: "My Calendar", is_default: true })
    .select("id")
    .single();

  if (error || !created) throw error ?? new Error("Failed to create calendar");
  return (created).id;
}

export const calendarService = {
  async getEvents(startDate: string, endDate: string): Promise<Result<CalendarEvent[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      const calendarId = await getOrCreateUserCalendarId(supabase, user.id);

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("calendar_id", calendarId)
        .gte("starts_at", startDate)
        .lte("starts_at", endDate)
        .order("starts_at");

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(((data as unknown as CalendarEventRow[]) ?? []).map(rowToCalendarEvent));
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "calendar_events_list"));
    }
  },

  async createEvent(event: Partial<CalendarEvent>): Promise<Result<CalendarEvent>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Not authenticated", "auth"));

      const calendarId = await getOrCreateUserCalendarId(supabase, user.id);
      const { all_day, ...rest } = event;

      const { data, error } = await supabase
        .from("calendar_events")
        .insert({ ...rest, calendar_id: calendarId, is_all_day: all_day ?? false } as never)
        .select()
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(rowToCalendarEvent(data as unknown as CalendarEventRow));
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "calendar_event_create"));
    }
  },

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<Result<CalendarEvent>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { all_day, ...rest } = updates;
      const payload = all_day === undefined ? rest : { ...rest, is_all_day: all_day };

      const { data, error } = await supabase
        .from("calendar_events")
        .update(payload as never)
        .eq("id", id)
        .select()
        .single();

      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(rowToCalendarEvent(data as unknown as CalendarEventRow));
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "calendar_event_update"));
    }
  },

  async deleteEvent(id: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) return fail(new DatabaseError(error.message, error.code));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "calendar_event_delete"));
    }
  },
};
