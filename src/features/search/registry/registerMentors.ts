import { SearchRegistry } from "../core/SearchRegistry";
import type { SearchRecord } from "../types";
import { mentorRepository } from "@/features/mentor-profile/services/mentor.repository";

export function registerMentors() {
  SearchRegistry.register("mentors", async () => {
    const mentors = await mentorRepository.listCatalog();
    return mentors.map((m): SearchRecord => ({
      id: `mentor_${m.slug}`,
      type: "mentor",
      title: m.name,
      subtitle: `${m.role} at ${m.company}`,
      description: m.bio,
      category: "Mentors",
      url: `/mentors/${m.slug}`,
      image: m.avatar,
      keywords: [m.category, ...m.expertise, m.company],
      popularity: m.rating * m.studentsMentored,
    }));
  });
}
