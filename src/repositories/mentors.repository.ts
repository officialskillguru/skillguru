import { BaseRepository, type PaginationOptions, type PaginatedResponse } from "./base.repository";
import { supabase } from "@/lib/supabase/client";
import { type Result, ok, fail, DatabaseError, UnexpectedError } from "@/utils/result";
import type { Database } from "@/types/database.types";

export type MentorRow = Database["public"]["Tables"]["mentor_profiles"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type MentorWithProfile = MentorRow & { profile: ProfileRow | null };

export interface MentorFilters {
  search?: string;
  status?: string;
}

export class MentorsRepository extends BaseRepository<"mentor_profiles"> {
  constructor() {
    super(supabase, "mentor_profiles");
  }

  async getMentors(filters: MentorFilters, options: PaginationOptions): Promise<Result<PaginatedResponse<MentorWithProfile>>> {
    try {
      let query = this.client
        .from("mentor_profiles")
        .select(`
          *,
          profile:profiles(*)
        `, { count: "exact" });

      if (filters.search) {
        query = query.or(`headline.ilike.%${filters.search}%,bio.ilike.%${filters.search}%`);
      }

      // We can't filter by status because status is not in profiles in the new schema, stubbing
      // if (filters.status && filters.status !== "all") { ... }

      const offset = (options.page - 1) * options.limit;
      const { data, count, error } = await query.range(offset, offset + options.limit - 1);

      if (error) return fail(this.mapError(error, "getMentors"));

      let filteredData: MentorWithProfile[] = (data) || [];

      if (filters.search) {
         const searchLower = filters.search.toLowerCase();
         filteredData = filteredData.filter((m) => 
           m.headline?.toLowerCase().includes(searchLower) || 
           m.bio?.toLowerCase().includes(searchLower) ||
           m.profile?.full_name?.toLowerCase().includes(searchLower) ||
           m.profile?.email?.toLowerCase().includes(searchLower)
         );
      }

      return ok({
        data: filteredData,
        count: count || 0,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil((count || 0) / options.limit),
      });
    } catch (err: unknown) {
      return fail(new UnexpectedError("Failed to get mentors", String(err), undefined, err));
    }
  }

  async updateMentorStatus(profileId: string, status: string): Promise<Result<void>> {
    return fail(new UnexpectedError("status field unsupported", "unsupported"));
  }

  createMentorProfile(_email: string, _fullName: string, _company: string, _designation: string): Promise<Result<void>> {
      return Promise.resolve(fail(new UnexpectedError("Admin creation of mentors requires backend Edge Functions to securely bypass Auth.", "UNSUPPORTED_ACTION")));
  }

  async search(
    query: string,
    options: PaginationOptions
  ): Promise<Result<PaginatedResponse<MentorWithProfile>>> {
    return this.getMentors({ search: query }, options);
  }
}

export const mentorsRepository = new MentorsRepository();
