import { type Result, ok, fail, type AppError, DatabaseError } from "@/utils/result";
import type { PaginationOptions, PaginatedResponse } from "./base.repository";
import { ProfilePersistence } from "@/persistence/profile.persistence";
import { mapProfileRowToDomain } from "@/domain/auth/mappers/profile.mapper";
import type { Profile } from "@/domain/auth/models/Profile";
import type { UpdateProfileDto } from "@/domain/auth/dtos/UpdateProfileDto";
import { supabase } from "@/lib/supabase/client";

export class ProfilesRepository {
  async findByEmail(email: string): Promise<Result<Profile, AppError>> {
    try {
      // NOTE: We should eventually move all raw queries to the persistence layer.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

      if (error) return fail(new DatabaseError(error.message, "findByEmail"));
      
      const domainModel = mapProfileRowToDomain(data);
      return ok(domainModel);
    } catch (err: unknown) {
      return fail(new DatabaseError(String(err), "findByEmail"));
    }
  }

  async findById(id: string): Promise<Result<Profile, AppError>> {
    const result = await ProfilePersistence.getProfileById(id);
    if (!result.success) return fail(result.error);
    
    return ok(mapProfileRowToDomain(result.data));
  }

  async update(id: string, dto: UpdateProfileDto): Promise<Result<Profile, AppError>> {
    // Map DTO to persistence updates
    const updates = {
      full_name: dto.fullName,
      avatar_file_id: dto.avatarFileId,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      address: dto.address,
      phone: dto.phone,
      username: dto.username,
      bio: dto.bio,
      linkedin_url: dto.linkedinUrl,
      github_url: dto.githubUrl,
      portfolio_url: dto.portfolioUrl,
      website_url: dto.websiteUrl,
      twitter_url: dto.twitterUrl,
      metadata: dto.metadata as unknown as string, // Persistence boundary cast
      updated_at: new Date().toISOString(),
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => updates[key as keyof typeof updates] === undefined && delete updates[key as keyof typeof updates]);

    const result = await ProfilePersistence.updateProfile(id, updates);
    if (!result.success) return fail(result.error);

    return ok(mapProfileRowToDomain(result.data));
  }

  async search(query: string, options: PaginationOptions): Promise<Result<PaginatedResponse<Profile>, AppError>> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .textSearch("full_name", query)
        .range(offset, offset + limit - 1);

      if (error) return fail(new DatabaseError(error.message, "search"));
      
      const totalCount = count || 0;
      return ok({
        data: (data || []).map(mapProfileRowToDomain),
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (err: unknown) {
      return fail(new DatabaseError(String(err), "search"));
    }
  }
}

export const profilesRepository = new ProfilesRepository();
