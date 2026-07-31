import type { Mentor as BaseMentor } from "@/types/platform";
import { type Mentor } from "../types";
import { mentorRepository } from "./mentor.repository";

export class MentorService {
  async getMentorBySlug(slug: string): Promise<Mentor | null> {
    try {
      return await mentorRepository.findBySlug(slug);
    } catch (error: unknown) {
      console.error(`Failed to fetch mentor with slug: ${slug}`, error);
      throw error;
    }
  }

  async getRelatedMentors(currentMentorId: string, expertise: string[], limit = 3): Promise<BaseMentor[]> {
    return mentorRepository.findRelated(currentMentorId, expertise, limit);
  }
}

export const mentorService = new MentorService();
