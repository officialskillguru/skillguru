import { type Result, fail, type AppError, UnexpectedError } from "@/utils/result";
import { logger } from "@/config/logger";
import { profilesRepository } from "@/repositories/profiles.repository";
import { uploadFile } from "@/services/storage.service";
import type { Profile } from "@/domain/auth/models/Profile";
import type { UpdateProfileDto } from "@/domain/auth/dtos/UpdateProfileDto";

export class ProfileService {
  async updateProfile(userId: string, data: UpdateProfileDto): Promise<Result<Profile, AppError>> {
    return profilesRepository.update(userId, data);
  }

  async uploadAvatar(userId: string, file: File): Promise<Result<Profile, AppError>> {
    try {
      // Reuses the canonical upload pipeline (MIME validation, `files` table
      // registration, rollback-on-failure) instead of a second, ad-hoc upload
      // path - this previously uploaded to a bucket named "avatars" that
      // doesn't exist in the project, so every real avatar upload failed.
      const uploaded = await uploadFile("students", file, userId);
      return profilesRepository.update(userId, { avatarFileId: uploaded.fileId });
    } catch (err: unknown) {
      logger.error("ProfileService uploadAvatar Error", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      return fail(new UnexpectedError(message, String(err), undefined, err));
    }
  }
}

export const profileService = new ProfileService();
