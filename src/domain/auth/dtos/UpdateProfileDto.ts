export interface UpdateProfileDto {
  fullName?: string;
  avatarFileId?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  username?: string | null;
  bio?: string | null;
  metadata?: Record<string, unknown>;
}
