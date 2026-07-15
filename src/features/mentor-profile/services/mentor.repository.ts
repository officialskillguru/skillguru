import { type Mentor } from "../types";
import { createMentorProfile } from "./mentorProfileFactory";
import { getSupabaseClientOrThrow } from "@/services/_shared";
import type { Mentor as BaseMentor } from "@/types/platform";
import { createSlug } from "@/lib/slug";

export class MentorRepository {
  async findBySlug(slug: string): Promise<Mentor | null> {
    const supabase = getSupabaseClientOrThrow();
    
    // First, fetch all mentors to find the one matching the slug 
    // (since slug is not in DB and generated from profile full_name)
    const { data: mentors_raw, error: mentorsError } = await (supabase as unknown as { from: (t: string) => { select: (q: string) => Promise<{ data: { id: string, designation?: string, company?: string, experience_years?: number, total_students?: number, rating?: number, bio?: string }[] | null, error: unknown }> } }).from("mentor_profiles")
      .select("*");
      
    if (mentorsError || !mentors_raw) return null;
    const mentors = mentors_raw;
    
    const profileIds = mentors.map(m => m.id).filter(Boolean);
    if (profileIds.length === 0) return null;
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", profileIds);
      
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    
    // Find matching mentor by generated slug
    let targetMentor = null;
    let targetProfile = null;
    
    for (const mentor of mentors) {
      if (!mentor.id) continue;
      const profile = profileMap.get(mentor.id);
      if (!profile || !profile.full_name) continue;
      
      const generatedSlug = createSlug(profile.full_name);
      if (generatedSlug === slug) {
        targetMentor = mentor;
        targetProfile = profile;
        break;
      }
    }
    
    if (!targetMentor || !targetProfile) {
      return null;
    }
    
    // Map to BaseMentor structure expected by createMentorProfile
    const baseMentor: BaseMentor = {
      slug: slug,
      name: targetProfile.full_name || "Unknown Mentor",
      role: targetMentor.designation || "Mentor",
      company: targetMentor.company || "Independent",
      companyLogo: `https://logo.clearbit.com/${(targetMentor.company || "tech").toLowerCase().replace(/\s/g, '')}.com`,
      avatar: targetProfile.avatar_file_id || "https://i.pravatar.cc/150",
      category: "Mentorship",
      experience: `${targetMentor.experience_years || 0} Years`,
      experienceYears: targetMentor.experience_years || 0,
      studentsMentored: targetMentor.total_students || 0,
      rating: targetMentor.rating || 5.0,
      location: "Remote",
      language: "English",
      availability: "Available",
      bio: targetMentor.bio || "Passionate mentor dedicated to helping you succeed.",
      expertise: ["Software Engineering", "System Design"],
      workedWith: [targetMentor.company || "Various Companies"]
    };
    
    return createMentorProfile(baseMentor);
  }
}

export const mentorRepository = new MentorRepository();
