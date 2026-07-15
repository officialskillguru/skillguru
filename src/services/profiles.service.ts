import { profilesRepository } from "@/repositories/profiles.repository";
import { type Result } from "@/utils/result";
import type { Profile } from "@/domain/auth/models/Profile";
import type { AppError } from "@/utils/result";

export class ProfilesService {
  async getProfile(id: string): Promise<Result<Profile, AppError>> {
    return profilesRepository.findById(id);
  }

  async getProfileByEmail(email: string): Promise<Result<Profile, AppError>> {
    return profilesRepository.findByEmail(email);
  }
}

export const profilesService = new ProfilesService();
