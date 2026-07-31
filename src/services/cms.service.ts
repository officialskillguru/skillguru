import { type Result, ok, fail, DatabaseError } from "@/utils/result";
import { getSupabaseClientOrThrow } from "./_shared";

export class CMSService {
  async getSetting<T>(key: string): Promise<Result<T | null>> {
    const supabase = getSupabaseClientOrThrow();
    const { data, error } = await supabase.from("system_settings").select("value").eq("id", key).maybeSingle();
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok((data?.value as T) ?? null);
  }

  async setSetting(key: string, value: unknown): Promise<Result<void>> {
    const supabase = getSupabaseClientOrThrow();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("system_settings").upsert({
      id: key,
      value: value as never,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) return fail(new DatabaseError(error.message, error.code));
    return ok(undefined);
  }
}

export const cmsService = new CMSService();
