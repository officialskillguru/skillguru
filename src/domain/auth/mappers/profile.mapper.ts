import type { Database } from "@/types/database.types";
import type { Profile, MentorProfile, StudentProfile } from "../models/Profile";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MentorRow = Database["public"]["Tables"]["mentor_profiles"]["Row"];
type StudentRow = Database["public"]["Tables"]["student_profiles"]["Row"];

export function mapProfileRowToDomain(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarFileId: row.avatar_file_id,
    city: row.city,
    state: row.state,
    country: row.country,
    address: row.address,
    phone: row.phone,
    username: row.username,
    bio: row.bio,
    orgId: row.org_id,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at,
  };
}

export function mapMentorRowToDomain(row: MentorRow): MentorProfile {
  return {
    id: row.id,
    bio: row.bio,
    headline: row.headline,
    expertise: row.expertise || [],
    yearsOfExperience: row.years_of_experience,
    isVerified: row.is_verified,
    loginDisabled: row.login_disabled,
  };
}

export function mapStudentRowToDomain(row: StudentRow): StudentProfile {
  return {
    id: row.id,
    education: row.education,
    college: row.college,
    graduationYear: row.graduation_year,
    skills: row.skills || [],
    interests: row.interests || [],
  };
}
