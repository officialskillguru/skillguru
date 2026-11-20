import { describe, expect, it } from "vitest";
import {
  emptyResumeData,
  entryFactories,
  getFormatErrors,
  getGenerationIssues,
  parseStoredResumeData,
  toBullets,
  type ResumeData,
} from "../domain/resume-schema";
import { mapProfileToResumeData, mergeImportedData, type ProfileImportSource } from "../domain/profile-import";
import { analyzeResumeQuality } from "../domain/quality-check";
import { _loadRegistryForTests, getActiveTemplates } from "../domain/templates";

describe("parseStoredResumeData", () => {
  it("fills defaults for an empty document", () => {
    const data = parseStoredResumeData(null);
    expect(data.personal.fullName).toBe("");
    expect(data.education).toEqual([]);
  });

  it("keeps half-typed values and only resets the individual broken field", () => {
    const data = parseStoredResumeData({
      personal: { fullName: "Aarav", email: "aarav@", phone: 12345, linkedin: "linkedin.com/in/x" },
      education: [{ id: "e1", institution: "PU", current: "yes" }, "garbage", null, { institution: "No id" }],
      skills: [{ id: "s", category: "Langs", items: ["Python", "Python", 7, " ", "Java"] }],
      unknownKey: "dropped",
    });
    expect(data.personal).toMatchObject({ fullName: "Aarav", email: "aarav@", phone: "", linkedin: "linkedin.com/in/x" });
    expect(data.education).toHaveLength(2);
    expect(data.education[0]).toMatchObject({ id: "e1", institution: "PU", current: false });
    expect(data.education[1]?.id).toBeTruthy();
    expect(data.skills[0]?.items).toEqual(["Python", "Java"]);
    expect(data).not.toHaveProperty("unknownKey");
  });

  it("never shares default objects between documents (regression)", () => {
    const a = parseStoredResumeData({});
    const b = parseStoredResumeData({ personal: "corrupt", summary: 5 });
    a.personal.email = "leak@example.com";
    a.summary.summary = "leak";
    a.education.push(entryFactories.education());
    expect(b.personal.email).toBe("");
    expect(b.summary.summary).toBe("");
    expect(emptyResumeData().personal.email).toBe("");
    expect(emptyResumeData().education).toEqual([]);
  });

  it("caps over-long text and entry counts instead of rejecting", () => {
    const data = parseStoredResumeData({ personal: { fullName: "x".repeat(500) }, languages: Array.from({ length: 40 }, (_, i) => ({ id: `l${i}`, name: "L" })) });
    expect(data.personal.fullName).toHaveLength(100);
    expect(data.languages).toHaveLength(15);
  });
});

describe("format rules", () => {
  it("reports invalid email, phone, links and dates by field path, ignoring empty fields", () => {
    const data = emptyResumeData();
    data.personal.email = "aarav@";
    data.personal.phone = "abc";
    data.personal.github = "github.com/aarav";
    data.education.push({ ...entryFactories.education(), startDate: "2025", endDate: "2023" });
    data.projects.push({ ...entryFactories.project(), liveUrl: "https://aarav.dev" });
    expect(getFormatErrors(data)).toEqual({
      "personal.email": expect.stringContaining("email"),
      "personal.phone": expect.stringContaining("phone"),
      "personal.github": expect.stringContaining("https://"),
      "education.0.endDate": expect.stringContaining("before the start"),
    });
    expect(getFormatErrors(emptyResumeData())).toEqual({});
  });

  it("lists what blocks PDF generation", () => {
    const issues = getGenerationIssues(emptyResumeData(), null).map((i) => i.section);
    expect(issues).toEqual(["Setup", "Personal Information", "Personal Information", "Personal Information", "Content"]);
  });

  it("splits bullets and strips typed bullet glyphs", () => {
    expect(toBullets("- one\n\n• two\n3) three\n  four  ")).toEqual(["one", "two", "three", "four"]);
  });
});

const source: ProfileImportSource = {
  profile: {
    id: "u1", full_name: "Aarav Sharma", email: "aarav@example.com", phone: "+91 98765 43210", city: "Pune", state: "MH", country: "India",
    linkedin_url: "https://linkedin.com/in/aarav", github_url: "javascript:alert(1)", portfolio_url: null, website_url: null, bio: "BCA student",
    education: "BCA", college: "Pune University", graduation_year: 2025, skills: ["Python", "React", "Python"],
  },
  experience: [{ id: "x", student_id: "u1", title: "Intern", company: "Acme", location: null, start_date: "2024-06-01", end_date: null, is_current: true, description: "Helped", sort_order: 0, created_at: "", updated_at: "", deleted_at: null }],
  projects: [{ id: "p", student_id: "u1", title: "Attendance", description: "made app", tech_stack: ["React"], project_url: "https://github.com/a/b", sort_order: 0, created_at: "", updated_at: "", deleted_at: null }],
  certifications: [],
  achievements: [],
};

describe("profile import", () => {
  it("maps real profile fields without inventing data and drops unsafe links", () => {
    const mapped = mapProfileToResumeData(source);
    expect(mapped.personal).toMatchObject({ fullName: "Aarav Sharma", github: "", linkedin: "https://linkedin.com/in/aarav" });
    expect(mapped.education?.[0]).toMatchObject({ degree: "BCA", institution: "Pune University", endDate: "2025", startDate: "" });
    expect(mapped.experience?.[0]).toMatchObject({ title: "Intern", organization: "Acme", startDate: "2024-06", current: true, endDate: "" });
    expect(mapped.projects?.[0]).toMatchObject({ repoUrl: "https://github.com/a/b", liveUrl: "" });
    expect(mapped.skills?.[0]?.items).toEqual(["Python", "React"]);
  });

  it("merges without overwriting typed values or duplicating entries", () => {
    const current: ResumeData = emptyResumeData();
    current.personal.fullName = "Aarav S.";
    current.projects.push({ ...entryFactories.project(), name: "attendance " });
    current.skills.push({ ...entryFactories.skillGroup("Technical Skills"), items: ["python"] });
    const { data, addedCount } = mergeImportedData(current, mapProfileToResumeData(source));
    expect(data.personal.fullName).toBe("Aarav S.");
    expect(data.personal.email).toBe("aarav@example.com");
    expect(data.projects).toHaveLength(1);
    expect(data.skills[0]?.items).toEqual(["python", "React"]);
    expect(addedCount).toBeGreaterThan(0);
    expect(current.personal.email).toBe(""); // original object untouched
  });
});

describe("quality checker", () => {
  it("is transparent: points add up and every lost point has a suggestion", () => {
    const report = analyzeResumeQuality(emptyResumeData(), null);
    expect(report.maxScore).toBe(100);
    expect(report.level).toBe("Needs Improvement");
    for (const c of report.checks) if (c.earned < c.points) expect(c.suggestion).toBeTruthy();
    expect(report.notAssessed.length).toBeGreaterThan(0);
  });

  it("rewards a complete resume and flags long first-person paragraphs", () => {
    const d = emptyResumeData();
    Object.assign(d.personal, { fullName: "A", email: "a@b.co", phone: "+91 9876543210", city: "Pune", linkedin: "https://linkedin.com/in/a", headline: "Frontend Developer" });
    d.summary.summary = "Frontend developer and final-year BCA student with hands-on experience building responsive web applications using React, TypeScript and Node.js, focused on clean and accessible interfaces.";
    d.education.push({ ...entryFactories.education(), institution: "PU", degree: "BCA", endDate: "2025" });
    d.projects.push({ ...entryFactories.project(), name: "Attendance", description: "Developed an attendance app\nAdded login", technologies: ["React"] });
    d.skills.push({ ...entryFactories.skillGroup("Frontend"), items: ["React", "TypeScript", "HTML", "CSS", "Git"] });
    const good = analyzeResumeQuality(d, "Frontend Developer");
    expect(good.checks.find((c) => c.id === "role-relevance")?.earned).toBe(3);
    expect(good.checks.find((c) => c.id === "clarity-voice")?.earned).toBe(4);

    d.projects[0]!.description = `I made ${"a very long sentence ".repeat(20)}`;
    const worse = analyzeResumeQuality(d, "Frontend Developer");
    expect(worse.checks.find((c) => c.id === "clarity-voice")?.earned).toBe(0);
    expect(worse.score).toBeLessThan(good.score);
  });
});

describe("template registry reader", () => {
  it("ships with no templates and never shows unreviewed or inactive ones", () => {
    expect(getActiveTemplates()).toEqual([]);
    const base = { name: "T", description: "", version: "1.0.0", mainFile: "r.tex", bodyTemplate: "b.tpl", compiler: "pdflatex", supportedSections: ["personal"], ats: { singleColumn: true, notes: "" } };
    const list = _loadRegistryForTests({
      registryVersion: 1,
      templates: [
        { ...base, id: "ok", status: "active", license: { name: "MIT", commercialUseReviewed: true } },
        { ...base, id: "unreviewed", status: "active", license: { name: "?", commercialUseReviewed: false } },
        { ...base, id: "testing", status: "testing", license: { name: "MIT", commercialUseReviewed: true } },
      ],
    });
    expect(getActiveTemplates(list).map((t) => t.id)).toEqual(["ok"]);
    expect(_loadRegistryForTests({ registryVersion: 2, templates: [] })).toEqual([]);
  });
});
