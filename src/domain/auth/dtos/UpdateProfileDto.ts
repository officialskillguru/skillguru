export interface UpdateProfileDto {
  fullName?: string;
  avatarFileId?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  phone?: string | null;
  username?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  metadata?: Record<string, unknown>;
}
