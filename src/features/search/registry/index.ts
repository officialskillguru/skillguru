import { registerMentors } from "./registerMentors";
import { SearchRegistry } from "../core/SearchRegistry";
import type { SearchRecord } from "../types";
import type { Course } from "@/types/platform";
import { courses } from "@/data/platform";

export function initializeSearchRegistry() {
  registerMentors();

  // 1. Register Courses
  SearchRegistry.register("courses", () => {
    return courses.map((c: Course) => {
      const record: SearchRecord = {
        id: `course_${c.slug}`,
        type: "course",
        title: c.title,
        subtitle: c.category,
        description: c.summary,
        category: "Courses",
        url: `/courses/${c.slug}`,
        image: c.image,
        keywords: [c.category, ...c.skills, c.level],
        popularity: 90,
      };
      return record;
    });
  });

  // 2. Register Projects (Mock)
  SearchRegistry.register("projects", () => {
    return [
      {
        id: "project_1",
        type: "project",
        title: "E-Commerce Microservices",
        subtitle: "Advanced Node.js",
        category: "Projects",
        url: "/projects/e-commerce",
        icon: "LayoutDashboard",
        keywords: ["node", "microservices", "backend"],
        popularity: 80,
      }
    ];
  });

  // 3. Register FAQs (Mock)
  SearchRegistry.register("faqs", () => {
    return [
      {
        id: "faq_1",
        type: "faq",
        title: "Do you offer placement guarantee?",
        description: "We offer 100% placement assistance but not a guarantee.",
        category: "FAQ",
        url: "/faq#placement",
        icon: "HelpCircle",
        keywords: ["placement", "job", "guarantee"],
        popularity: 100,
      }
    ];
  });
}
