import { getExtendedSupabaseClient, normalizeSearchTerm } from "./_shared";
import { type Result, ok, fail, DatabaseError } from "@/utils/result";

// ============================================================================
// Types
// ============================================================================
export type LeadStatus =
  | "new" | "contacted" | "qualified" | "demo_scheduled"
  | "follow_up" | "converted" | "lost" | "closed";

export type LeadPriority = "low" | "medium" | "high" | "urgent";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  course_interest_id: string | null;
  budget: number | null;
  source_id: string | null;
  assigned_mentor_id: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  expected_joining_date: string | null;
  notes: string | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  course?: { title: string } | null;
  source?: { name: string } | null;
  assigned_mentor?: { full_name: string; email: string } | null;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  author?: { full_name: string } | null;
}

export interface LeadFollowup {
  id: string;
  lead_id: string;
  assigned_to: string;
  type: "call" | "email" | "whatsapp" | "meeting" | "demo" | "other";
  scheduled_at: string;
  completed_at: string | null;
  notes: string | null;
  status: "pending" | "completed" | "cancelled" | "overdue";
  created_at: string;
  assignee?: { full_name: string } | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assigner_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "overdue";
  priority: LeadPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string } | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { full_name: string } | null;
}

export interface MentorNote {
  id: string;
  mentor_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { full_name: string } | null;
}

// Mentor task types are a curated preset list, not a DB enum — `tasks.title`
// stays free text (no schema change needed) and the preset just pre-fills it;
// admins can still type a fully custom title ("Custom Task").
export const MENTOR_TASK_TYPES = [
  "Review Assignment",
  "Review Resume",
  "Review Project",
  "Call Student",
  "Interview Student",
  "Update Course",
  "Publish Lesson",
  "Upload Notes",
  "Verify Certificate",
  "Conduct Live Session",
  "Custom Task",
] as const;
export type MentorTaskType = (typeof MENTOR_TASK_TYPES)[number];

export interface LeadFilters {
  status?: LeadStatus | "all";
  source_id?: string;
  assigned_mentor_id?: string;
  priority?: LeadPriority;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  items?: PipelineItem[];
}

export interface PipelineItem {
  id: string;
  stage_id: string;
  lead_id: string | null;
  position: number;
  lead?: Lead | null;
}

export interface PipelineBoard {
  id: string;
  name: string;
  stages: PipelineStage[];
}

// ============================================================================
// CRM Service
// ============================================================================
export const crmService = {
  async listLeads(filters: LeadFilters = {}): Promise<Result<{ data: Lead[]; count: number }>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("leads")
        .select(
          `*, 
          course:courses(title),
          source:lead_sources(name),
          assigned_mentor:profiles!leads_assigned_mentor_id_fkey(full_name, email)`,
          { count: "exact" }
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.source_id) query = query.eq("source_id", filters.source_id);
      if (filters.assigned_mentor_id) query = query.eq("assigned_mentor_id", filters.assigned_mentor_id);
      if (filters.priority) query = query.eq("priority", filters.priority);
      const search = normalizeSearchTerm(filters.search);
      if (search) {
        query = query.or(`name.ilike.${search},email.ilike.${search},phone.ilike.${search}`);
      }

      const { data, error, count } = await query;
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok({ data: (data as Lead[]) ?? [], count: count ?? 0 });
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_leads_list"));
    }
  },

  async getLead(id: string): Promise<Result<Lead>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .select(`*, course:courses(title, slug), source:lead_sources(name), assigned_mentor:profiles!leads_assigned_mentor_id_fkey(full_name, email)`)
        .eq("id", id)
        .single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(data as Lead);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_lead_get"));
    }
  },

  async createLead(lead: Partial<Lead>): Promise<Result<Lead>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("leads").insert(lead as never).select().single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      await supabase.from("lead_activities").insert({ lead_id: (data as Lead).id, action: "created", details: { initial_status: (data as Lead).status } } as never);
      return ok(data as Lead);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_lead_create"));
    }
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Result<Lead>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: old } = await supabase.from("leads").select("*").eq("id", id).single();
      const { data, error } = await supabase.from("leads").update(updates as never).eq("id", id).select().single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      if (old && updates.status && (old as Lead).status !== updates.status) {
        await supabase.from("lead_activities").insert({ lead_id: id, action: "status_changed", details: { from: (old as Lead).status, to: updates.status } } as never);
      }
      return ok(data as Lead);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_lead_update"));
    }
  },

  async deleteLead(id: string): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase.from("leads").update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_lead_delete"));
    }
  },

  async assignLead(leadId: string, mentorId: string): Promise<Result<Lead>> {
    return crmService.updateLead(leadId, { assigned_mentor_id: mentorId });
  },

  async changeLeadStatus(leadId: string, status: LeadStatus): Promise<Result<Lead>> {
    return crmService.updateLead(leadId, { status });
  },

  async getLeadNotes(leadId: string): Promise<Result<LeadNote[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("lead_notes").select("*, author:profiles!lead_notes_author_id_fkey(full_name)").eq("lead_id", leadId).order("created_at", { ascending: false });
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok((data as LeadNote[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_notes_list"));
    }
  },

  async addLeadNote(leadId: string, content: string, isPrivate = false): Promise<Result<LeadNote>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));
      const { data, error } = await supabase.from("lead_notes").insert({ lead_id: leadId, author_id: user.id, content, is_private: isPrivate } as never).select("*, author:profiles!lead_notes_author_id_fkey(full_name)").single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(data as LeadNote);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_note_add"));
    }
  },

  async getLeadFollowups(leadId: string): Promise<Result<LeadFollowup[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("lead_followups").select("*, assignee:profiles!lead_followups_assigned_to_fkey(full_name)").eq("lead_id", leadId).order("scheduled_at", { ascending: true });
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok((data as LeadFollowup[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_followup_list"));
    }
  },

  async createFollowup(followup: Partial<LeadFollowup>): Promise<Result<LeadFollowup>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("lead_followups").insert(followup as never).select().single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(data as LeadFollowup);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_followup_create"));
    }
  },

  async completeFollowup(followupId: string, notes?: string): Promise<Result<LeadFollowup>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("lead_followups").update({ status: "completed", completed_at: new Date().toISOString(), ...(notes && { notes }) } as never).eq("id", followupId).select().single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(data as LeadFollowup);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_followup_complete"));
    }
  },

  async listTasks(filters: { assigneeId?: string; status?: string; entityType?: string; entityId?: string } = {}): Promise<Result<Task[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      let query = supabase.from("tasks").select("*, assignee:profiles!tasks_assignee_id_fkey(full_name)").order("due_date", { ascending: true, nullsFirst: false });
      if (filters.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.entityType) query = query.eq("entity_type", filters.entityType);
      if (filters.entityId) query = query.eq("entity_id", filters.entityId);
      const { data, error } = await query;
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok((data as Task[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_tasks_list"));
    }
  },

  async createTask(task: Partial<Task>): Promise<Result<Task>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("tasks").insert(task as never).select().single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      const created = data as Task;
      if (created.entity_id) {
        await supabase.rpc("log_audit_event", {
          p_action: "task_created",
          p_entity_type: created.entity_type ?? "task",
          p_entity_id: created.entity_id,
          p_new_values: { title: created.title, priority: created.priority, due_date: created.due_date },
        });
      }
      return ok(created);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_task_create"));
    }
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Result<Task>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: old } = await supabase.from("tasks").select("entity_type, entity_id, status").eq("id", id).maybeSingle();
      const { data, error } = await supabase.from("tasks").update(updates as never).eq("id", id).select().single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      const updated = data as Task;
      if (old?.entity_id) {
        await supabase.rpc("log_audit_event", {
          p_action: "task_updated",
          p_entity_type: old.entity_type ?? "task",
          p_entity_id: old.entity_id,
          p_old_values: { status: old.status },
          p_new_values: { status: updated.status },
        });
      }
      return ok(updated);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_task_update"));
    }
  },

  async getPipelineBoard(): Promise<Result<PipelineBoard>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: pipeline, error: pipelineErr } = await supabase.from("pipelines").select("*").order("created_at", { ascending: true }).limit(1).single();
      if (pipelineErr) return fail(new DatabaseError(pipelineErr.message, pipelineErr.code ?? "DATABASE_ERROR"));
      const { data: stages, error: stagesErr } = await supabase.from("pipeline_stages").select(`*, items:pipeline_items(*, lead:leads(id, name, email, phone, status, priority, budget))`).eq("pipeline_id", (pipeline as { id: string }).id).order("position", { ascending: true });
      if (stagesErr) return fail(new DatabaseError(stagesErr.message, stagesErr.code ?? "DATABASE_ERROR"));
      return ok({ id: (pipeline as { id: string; name: string }).id, name: (pipeline as { id: string; name: string }).name, stages: (stages as PipelineStage[]) ?? [] });
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_pipeline_get"));
    }
  },

  async moveLeadToStage(itemId: string, newStageId: string, position: number): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { error } = await supabase.from("pipeline_items").update({ stage_id: newStageId, position } as never).eq("id", itemId);
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_pipeline_move"));
    }
  },

  async addLeadToPipeline(leadId: string, stageId: string): Promise<Result<PipelineItem>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("pipeline_items").insert({ lead_id: leadId, stage_id: stageId, position: 0 } as never).select().single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(data as PipelineItem);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_pipeline_add"));
    }
  },

  async getLeadSources(): Promise<Result<{ id: string; name: string; slug: string }[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("lead_sources").select("id, name, slug").eq("is_active", true).order("name");
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(data ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_sources_list"));
    }
  },

  async getStudentNotes(studentId: string): Promise<Result<{ id: string; content: string; author: { full_name: string } | null; is_private: boolean; created_at: string }[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase.from("student_notes").select("*, author:profiles!student_notes_author_id_fkey(full_name)").eq("student_id", studentId).order("created_at", { ascending: false });
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(data ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_student_notes_list"));
    }
  },

  async addStudentNote(studentId: string, content: string, isPrivate = false): Promise<Result<void>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));
      const { error } = await supabase.from("student_notes").insert({ student_id: studentId, author_id: user.id, content, is_private: isPrivate } as never);
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(undefined);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_student_note_add"));
    }
  },

  // --------------------------------------------------------------------------
  // Mentor notes (mirrors getStudentNotes/addStudentNote, targeting the
  // existing but previously-unwired mentor_notes table)
  // --------------------------------------------------------------------------
  async getMentorNotes(mentorId: string): Promise<Result<MentorNote[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase
        .from("mentor_notes")
        .select("*, author:profiles!mentor_notes_author_id_fkey(full_name)")
        .eq("mentor_id", mentorId)
        .order("created_at", { ascending: false });
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok((data as unknown as MentorNote[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_mentor_notes_list"));
    }
  },

  async addMentorNote(mentorId: string, content: string): Promise<Result<MentorNote>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));
      const { data, error } = await supabase
        .from("mentor_notes")
        .insert({ mentor_id: mentorId, author_id: user.id, content } as never)
        .select("*, author:profiles!mentor_notes_author_id_fkey(full_name)")
        .single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      await supabase.rpc("log_audit_event", {
        p_action: "mentor_note_added",
        p_entity_type: "mentor_profile",
        p_entity_id: mentorId,
      });
      return ok(data as unknown as MentorNote);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_mentor_note_add"));
    }
  },

  // --------------------------------------------------------------------------
  // Task comments (task_comments table already existed, unwired)
  // --------------------------------------------------------------------------
  async getTaskComments(taskId: string): Promise<Result<TaskComment[]>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data, error } = await supabase
        .from("task_comments")
        .select("*, author:profiles!task_comments_author_id_fkey(full_name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok((data as unknown as TaskComment[]) ?? []);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_task_comments_list"));
    }
  },

  async addTaskComment(taskId: string, content: string): Promise<Result<TaskComment>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fail(new DatabaseError("Unauthenticated", "auth"));
      const { data, error } = await supabase
        .from("task_comments")
        .insert({ task_id: taskId, author_id: user.id, content } as never)
        .select("*, author:profiles!task_comments_author_id_fkey(full_name)")
        .single();
      if (error) return fail(new DatabaseError(error.message, error.code ?? "DATABASE_ERROR"));
      return ok(data as unknown as TaskComment);
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_task_comment_add"));
    }
  },

  async getCRMMetrics(): Promise<Result<{
    totalLeads: number; newLeadsToday: number; activeStudents: number;
    pendingFollowups: number; todayMeetings: number; openTickets: number; conversionRate: number;
  }>> {
    try {
      const supabase = getExtendedSupabaseClient();
      const today = new Date().toISOString().split("T")[0];
      const [
        { count: totalLeads },
        { count: newLeadsToday },
        { count: activeStudents },
        { count: pendingFollowups },
        { count: todayMeetings },
        { count: openTickets },
        { count: convertedLeads },
      ] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", today!).is("deleted_at", null),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("lead_followups").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("meetings").select("id", { count: "exact", head: true }).gte("starts_at", today!),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted"),
      ]);
      const total = totalLeads ?? 0;
      const converted = convertedLeads ?? 0;
      return ok({
        totalLeads: total, newLeadsToday: newLeadsToday ?? 0, activeStudents: activeStudents ?? 0,
        pendingFollowups: pendingFollowups ?? 0, todayMeetings: todayMeetings ?? 0, openTickets: openTickets ?? 0,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      });
    } catch (e: unknown) {
      return fail(new DatabaseError(String(e), "crm_metrics"));
    }
  },
};
