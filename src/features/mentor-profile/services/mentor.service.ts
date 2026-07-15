import { type Mentor } from "../types";
import { mentorRepository } from "./mentor.repository";

export class MentorService {
  async getMentorBySlug(slug: string): Promise<Mentor | null> {
    try {
      const data = await mentorRepository.findBySlug(slug);
      if (!data) return null;
      // Here we would typically use a mapper to transform raw API data into our domain model
      return data;
    } catch (error: unknown) {
      console.error(`Failed to fetch mentor with slug: ${slug}`, error);
      throw error;
    }
  }

  async bookSession(mentorId: string, slotId: string, payload: Record<string, unknown>): Promise<boolean> {
    try {
      // Mock API call to book session
      console.log(`Booking session for mentor ${mentorId} slot ${slotId}`, payload);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    } catch (error: unknown) {
      console.error("Booking failed", error);
      throw error;
    }
  }
}

export const mentorService = new MentorService();
