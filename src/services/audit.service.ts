import { getExtendedSupabaseClient } from "./_shared";
import { type Result, ok, fail, DatabaseError } from "@/utils/result";
import type { Json } from "@/types/database.types";

export class AuditService {
  /**
   * Log an action to the audit logs table
   */
  async logAction(actorId: string | undefined, action: string, entityType: string, entityId?: string, details?: Json): Promise<void> {
    try {
      const supabase = getExtendedSupabaseClient();
      
      const { data: authData } = await supabase.auth.getUser();
      const actualActorId = actorId || authData?.user?.id; // Can be null if system action

      const { error } = await supabase.from('audit_logs').insert({
        actor_id: actualActorId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        new_values: details || {}
      });

      if (error) {
        console.error("Failed to log audit action", error);
      }
    } catch (e) {
      console.error("Audit log exception", e);
    }
  }

  /**
   * Fetch recent audit logs (Admin only)
   */
  async getRecentLogs(limit = 50): Promise<Result<Record<string, unknown>[]>> {
    const supabase = getExtendedSupabaseClient();
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profiles!audit_logs_actor_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(data || []);
  }
}

export const auditService = new AuditService();
