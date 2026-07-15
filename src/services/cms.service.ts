import { type Result, ok, fail, DatabaseError, UnexpectedError } from "@/utils/result";

export class CMSService {
  async getSetting<T>(key: string): Promise<Result<T | null>> {
    // Stubbed since system_settings table is missing in new schema
    return ok(null);
  }

  async setSetting(key: string, value: unknown): Promise<Result<void>> {
    // Stubbed since system_settings table is missing in new schema
    return ok(undefined);
  }
}

export const cmsService = new CMSService();
