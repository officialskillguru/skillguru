import webDevelopment from "./data/web-development.mjs";
import dataAi from "./data/data-ai.mjs";
import { programming, design } from "./data/programming-design.mjs";
import { marketing, security } from "./data/marketing-security.mjs";
import { business, cloud, finance, career } from "./data/business-cloud-finance-career.mjs";
import { CATEGORIES } from "./catalog.mjs";

// Required distribution from the product brief — validation fails if the data drifts.
export const EXPECTED_COUNTS = {
  "web-development": 15,
  "data-science-ai": 15,
  programming: 12,
  "ui-ux-design": 10,
  "digital-marketing": 10,
  cybersecurity: 10,
  "business-entrepreneurship": 8,
  "cloud-devops": 8,
  "finance-management": 6,
  "communication-career-skills": 6,
};

export function loadCourses() {
  const groups = {
    "web-development": webDevelopment,
    "data-science-ai": dataAi,
    programming,
    "ui-ux-design": design,
    "digital-marketing": marketing,
    cybersecurity: security,
    "business-entrepreneurship": business,
    "cloud-devops": cloud,
    "finance-management": finance,
    "communication-career-skills": career,
  };
  return Object.entries(groups).flatMap(([category, list]) => list.map((c) => ({ ...c, category })));
}

const LEVELS = new Set(["beginner", "intermediate", "advanced", "all_levels"]);

export function validateCourses(courses) {
  const problems = [];
  const slugs = new Set();
  const titles = new Set();
  const categorySlugs = new Set(CATEGORIES.map((c) => c.slug));
  const counts = {};

  for (const c of courses) {
    const id = c.s ?? c.t ?? "<unknown>";
    counts[c.category] = (counts[c.category] ?? 0) + 1;
    if (!categorySlugs.has(c.category)) problems.push(`${id}: unknown category ${c.category}`);
    if (!c.t || !c.s || !c.sd || !c.de || !c.d) problems.push(`${id}: missing title/slug/description/duration`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.s ?? "")) problems.push(`${id}: invalid slug`);
    if (slugs.has(c.s)) problems.push(`${id}: duplicate slug`);
    if (titles.has(c.t)) problems.push(`${id}: duplicate title`);
    slugs.add(c.s);
    titles.add(c.t);
    if (!LEVELS.has(c.l)) problems.push(`${id}: invalid level ${c.l}`);
    if (typeof c.p !== "number" || c.p < 0) problems.push(`${id}: invalid price`);
    if (!Array.isArray(c.sk) || c.sk.length < 3) problems.push(`${id}: needs at least 3 skills`);
    if (!Array.isArray(c.o) || c.o.length < 3) problems.push(`${id}: needs at least 3 outcomes`);
    if (!Array.isArray(c.r) || c.r.length < 1) problems.push(`${id}: needs prerequisites`);
    if (!Array.isArray(c.m) || c.m.length < 3) problems.push(`${id}: needs at least 3 modules`);
    for (const mod of c.m ?? []) {
      if (!Array.isArray(mod) || typeof mod[0] !== "string" || !Array.isArray(mod[1]) || mod[1].length < 2) {
        problems.push(`${id}: malformed module ${JSON.stringify(mod).slice(0, 60)}`);
      }
    }
  }
  for (const [cat, expected] of Object.entries(EXPECTED_COUNTS)) {
    if ((counts[cat] ?? 0) !== expected) problems.push(`category ${cat}: expected ${expected} courses, found ${counts[cat] ?? 0}`);
  }
  if (courses.length !== 100) problems.push(`expected exactly 100 courses, found ${courses.length}`);
  return problems;
}
