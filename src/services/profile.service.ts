import { supabase } from "@/lib/supabase/client";
import { type Result, fail, type AppError, DatabaseError, UnexpectedError } from "@/utils/result";
import { logger } from "@/config/logger";
import { profilesRepository } from "@/repositories/profiles.repository";
import type { Profile } from "@/domain/auth/models/Profile";
import type { UpdateProfileDto } from "@/domain/auth/dtos/UpdateProfileDto";

export class ProfileService {
  async updateProfile(userId: string, data: UpdateProfileDto): Promise<Result<Profile, AppError>> {
    return profilesRepository.update(userId, data);
  }

  async uploadAvatar(userId: string, file: File): Promise<Result<Profile, AppError>> {
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) return fail(new UnexpectedError("Failed to upload avatar", String(uploadError), undefined, uploadError));

      // 2. Create entry in `files` table
      const { data: fileData, error: dbFileError } = await supabase
        .from("files")
        .insert({
          bucket: "avatars",
          object_key: filePath,
          storage_path: filePath,
          mime_type: file.type,
          size_bytes: file.size,
          uploaded_by: userId,
          original_name: file.name,
          stored_name: fileName,
        })
        .select()
        .single();

      if (dbFileError || !fileData) return fail(new DatabaseError("Failed to create file record", String(dbFileError), undefined, dbFileError));

      // 3. Update profiles.avatar_file_id
      const updateResult = await profilesRepository.update(userId, { avatarFileId: fileData.id });
      
      return updateResult;
    } catch (err: unknown) {
      logger.error("ProfileService uploadAvatar Error", err);
      return fail(new UnexpectedError("An unexpected error occurred", String(err), undefined, err));
    }
  }
}

export const profileService = new ProfileService();

