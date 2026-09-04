import { FunctionsHttpError } from "@supabase/supabase-js";

import type { Json, Tables, Updates } from "@/types/database";
import { AppError, type ErrorCode } from "@/lib/errors";

import {
  assertServiceResponse,
  getSupabaseClientOrThrow,
  normalizeSearchTerm,
  paginationRange,
  type ListParams,
  type PaginatedResult,
} from "./_shared";
import { resolveFileUrl } from "./storage.service";

const EDGE_FUNCTION_CODE_MAP: Record<string, ErrorCode> = {
  EMAIL_EXISTS: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
};

/** Counsellor has no dedicated profile-extension table (unlike mentor_profiles/student_profiles) —
 *  its account/professional data lives entirely on the generic `profiles` row, plus an `isActive`
 *  flag sourced from `user_settings.is_active` for the lock/unlock account state. */
export type Counsellor = Tables<"profiles"> & {
  isActive: boolean;
  avatar?: string;
};

export type CounsellorListParams = ListParams & {
  status?: "active" | "locked";
  /** Include soft-deleted counsellors (needed to find candidates to restore). Default false. */
  includeDeleted?: boolean;
};

async function getCounsellorRoleId(): Promise<string | null> {
  const supabase = getSupabaseClientOrThrow();
  const { data } = await supabase.from("roles").select("id").eq("code", "counsellor").maybeSingle();
  return data?.id ?? null;
}

export async function listCounsellors(params: CounsellorListParams = {}): Promise<PaginatedResult<Counsellor>> {
  const supabase = getSupabaseClientOrThrow();
  const { page, pageSize, from, to } = paginationRange(params);
  const search = normalizeSearchTerm(params.search);

  const roleId = await getCounsellorRoleId();
  if (!roleId) return { data: [], count: 0, page, pageSize, totalPages: 0 };

  const { data: counsellorUserRoles } = await supabase.from("user_roles").select("user_id").eq("role_id", roleId);
  const counsellorIds = (counsellorUserRoles ?? []).map((ur) => ur.user_id);
  if (counsellorIds.length === 0) return { data: [], count: 0, page, pageSize, totalPages: 0 };

  let query = supabase.from("profiles").select("*", { count: "exact" }).in("id", counsellorIds);

  if (search) {
    query = query.or(`full_name.ilike.${search},email.ilike.${search},username.ilike.${search},phone.ilike.${search}`);
  }
  if (!params.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error, count } = await query
    .order(params.sortBy ?? "created_at", { ascending: params.sortDirection === "asc" })
    .range(from, to);
  assertServiceResponse(error);

  const profiles = data ?? [];
  const ids = profiles.map((p) => p.id);

  const settingsByUser: Record<string, boolean> = {};
  if (ids.length > 0) {
    const { data: settingsRows } = await supabase.from("user_settings").select("user_id, is_active").in("user_id", ids);
    for (const s of settingsRows ?? []) {
      settingsByUser[s.user_id] = s.is_active ?? true;
    }
  }

  const mapped = await Promise.all(
    profiles.map(async (p) => {
      const avatar = p.avatar_file_id ? (await resolveFileUrl(p.avatar_file_id)) ?? "" : "";
      return { ...p, avatar, isActive: settingsByUser[p.id] ?? true };
    })
  );

  const filtered =
    params.status === "active"
      ? mapped.filter((c) => c.isActive)
      : params.status === "locked"
        ? mapped.filter((c) => !c.isActive)
        : mapped;

  return { data: filtered, count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
}

export async function getCounsellor(id: string): Promise<Counsellor> {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  assertServiceResponse(error);
  const { data: settings } = await supabase.from("user_settings").select("is_active").eq("user_id", id).maybeSingle();
  return { ...data, isActive: settings?.is_active ?? true };
}

export interface CreateCounsellorInput {
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  password?: string;
}

export interface CreateCounsellorResult {
  id: string;
  email: string;
  fullName: string;
  onboardingMethod: "manual";
  temporaryPassword: string;
}

interface CreateCounsellorResponse {
  success: boolean;
  message?: string;
  data?: CreateCounsellorResult;
}

export async function createCounsellor(input: CreateCounsellorInput): Promise<CreateCounsellorResult> {
  const supabase = getSupabaseClientOrThrow();

  const payload = {
    fullName: input.name,
    email: input.email,
    phone: input.phone,
    bio: input.bio,
    password: input.password || undefined,
    onboardingMethod: "manual" as const,
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<CreateCounsellorResponse>("create-counsellor", {
    body: payload,
  });

  if (error) {
    let parsedMessage: string | undefined;
    let parsedCode: string | undefined;
    if (error instanceof FunctionsHttpError && error.context instanceof Response) {
      try {
        const body: unknown = await error.context.clone().json();
        if (body && typeof body === "object") {
          if ("message" in body && typeof body.message === "string") parsedMessage = body.message;
          if ("code" in body && typeof body.code === "string") parsedCode = body.code;
        }
      } catch {
        /* response body wasn't JSON - fall through to the generic error */
      }
    }
    const message = parsedMessage || (error instanceof Error ? error.message : "Failed to create counsellor");
    const mappedCode = parsedCode ? EDGE_FUNCTION_CODE_MAP[parsedCode] : undefined;
    throw new AppError(message, mappedCode ?? "INTERNAL_ERROR", { edgeFunctionCode: parsedCode });
  }

  if (!data?.success || !data.data) {
    throw new AppError(data?.message || "Failed to create counsellor", "INTERNAL_ERROR");
  }

  return data.data;
}

export interface CounsellorFullUpdateInput {
  name?: string;
  phone?: string;
  username?: string | null;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin_url?: string;
}

export async function updateCounsellor(id: string, input: CounsellorFullUpdateInput) {
  const supabase = getSupabaseClientOrThrow();
  const { name, ...rest } = input;
  const update: Updates<"profiles"> = { ...rest };
  if (name !== undefined) update.full_name = name;

  const { data: old } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("profiles").update(update).eq("id", id).select("*").single();
  assertServiceResponse(error);
  await supabase.rpc("log_audit_event", {
    p_action: "counsellor_profile_updated",
    p_entity_type: "profile",
    p_entity_id: id,
    p_old_values: (old ? Object.fromEntries(Object.keys(update).map((k) => [k, (old as Record<string, unknown>)[k]])) : null) as Json,
    p_new_values: update as Json,
  });
  return data;
}

// ─── Account lifecycle — all go through the generic admin-account-action Edge
// Function (service-role auth.admin.* calls + audited RPCs), same boundary
// create-counsellor already established. Never a direct client table write for
// anything security-sensitive. ────────────────────────────────────────────────

interface AccountActionResponse {
  success: boolean;
  message?: string;
  data?: { userId: string };
}

async function invokeAccountAction(body: Record<string, unknown>): Promise<{ userId: string }> {
  const supabase = getSupabaseClientOrThrow();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- supabase-js's FunctionsError union resolves loosely here
  const { data, error } = await supabase.functions.invoke<AccountActionResponse>("admin-account-action", { body });
  if (error) throw error;
  if (!data?.success || !data.data) {
    throw new Error(data?.message || "Account action failed");
  }
  return data.data;
}

export async function setCounsellorPassword(id: string, password: string) {
  return invokeAccountAction({ action: "set_password", userId: id, password });
}

export async function forceCounsellorPasswordChange(id: string) {
  return invokeAccountAction({ action: "force_password_change", userId: id });
}

export async function forceCounsellorLogout(id: string) {
  return invokeAccountAction({ action: "force_logout", userId: id });
}

export async function changeCounsellorEmail(id: string, newEmail: string) {
  return invokeAccountAction({ action: "change_email", userId: id, newEmail });
}

export async function lockCounsellor(id: string, reason?: string) {
  return invokeAccountAction({ action: "lock", userId: id, reason });
}

export async function unlockCounsellor(id: string) {
  return invokeAccountAction({ action: "unlock", userId: id });
}

export async function softDeleteCounsellor(id: string) {
  return invokeAccountAction({ action: "soft_delete", userId: id });
}

export async function restoreCounsellor(id: string) {
  return invokeAccountAction({ action: "restore", userId: id });
}

export async function listCounsellorLoginHistory(id: string, limit = 20) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("login_history")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);
  assertServiceResponse(error);
  return data ?? [];
}

export async function listCounsellorActiveSessions(id: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", id)
    .eq("is_active", true)
    .order("started_at", { ascending: false });
  assertServiceResponse(error);
  return data ?? [];
}
