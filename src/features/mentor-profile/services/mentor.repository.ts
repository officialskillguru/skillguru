import { type Mentor } from "../types";
import { mentors } from "@/data/platform";
import { createMentorProfile } from "./mentorProfileFactory";

export class MentorRepository {
  async findBySlug(slug: string): Promise<Mentor | null> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const baseMentor = mentors.find(m => m.slug === slug);
    if (!baseMentor) {
      return null;
    }
    
    return createMentorProfile(baseMentor);
  }
}

export const mentorRepository = new MentorRepository();
