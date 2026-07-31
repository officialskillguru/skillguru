export type AppRole = "admin" | "counsellor" | "sales" | "content_manager" | "student" | "mentor" | "user";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  avatarFileId: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  username: string | null;
  bio: string | null;
  orgId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MentorProfile {
  id: string;
  bio: string | null;
  headline: string | null;
  expertise: string[];
  yearsOfExperience: number | null;
  isVerified: boolean;
  loginDisabled: boolean;
}

export interface StudentProfile {
  id: string;
  education: string | null;
  college: string | null;
  graduationYear: number | null;
  skills: string[];
  interests: string[];
}

export interface AuthUser {
  profile: Profile;
  roles: string[];
  permissions: string[];
  mentorProfile?: MentorProfile | null;
  studentProfile?: StudentProfile | null;
  highestRole: string;
  passwordResetRequired: boolean;
}
