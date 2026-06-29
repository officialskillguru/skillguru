import { SearchRegistry } from "../core/SearchRegistry";
import type { SearchRecord } from "../types";
import type { Mentor } from "@/types/platform";
import { mentors } from "@/data/platform";

export function registerMentors() {
  SearchRegistry.register("mentors", () => {
    return mentors.map((m: Mentor) => {
      const record: SearchRecord = {
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
      };
      return record;
    });
  });
}
