// Representative resume documents used to validate every approved template
// (render tests in CI, and full compile + text-extraction checks in the worker image).

export const typicalStudent = {
  personal: {
    fullName: "Aarav Sharma",
    headline: "Final-year BCA student | Full-stack developer",
    email: "aarav.sharma@example.com",
    phone: "+91 98765 43210",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    linkedin: "https://www.linkedin.com/in/aarav-sharma",
    github: "https://github.com/aaravsharma",
    portfolio: "",
    website: "",
  },
  summary: {
    summary: "Final-year BCA student with hands-on experience building web applications using React, Node.js and MongoDB. Interested in full-stack development roles.",
    objective: "",
  },
  education: [
    { id: "e1", institution: "Savitribai Phule Pune University", degree: "Bachelor of Computer Applications", specialization: "", location: "Pune", startDate: "2022", endDate: "2025", current: false, cgpa: "8.4/10", percentage: "", coursework: "Data Structures, DBMS, Operating Systems", details: "" },
    { id: "e2", institution: "Fergusson College", degree: "Higher Secondary Certificate (Science)", specialization: "", location: "Pune", startDate: "", endDate: "2022", current: false, cgpa: "", percentage: "86%", coursework: "", details: "" },
  ],
  experience: [
    { id: "x1", kind: "internship", title: "Web Development Intern", organization: "TechNova Solutions", employmentType: "Internship", location: "Remote", startDate: "2024-05", endDate: "2024-07", current: false, responsibilities: "Built responsive pages with React and Tailwind CSS\nIntegrated REST APIs for the customer dashboard", achievements: "", technologies: ["React", "Tailwind CSS", "REST APIs"] },
  ],
  projects: [
    { id: "p1", name: "Attendance Management System", type: "Academic", description: "Developed a web-based attendance management application using React, Node.js and MongoDB.", technologies: ["React", "Node.js", "MongoDB"], features: "Role-based login for teachers and students\nMonthly attendance reports", contributions: "", repoUrl: "https://github.com/aaravsharma/attendance", liveUrl: "" },
  ],
  skills: [
    { id: "s1", category: "Programming Languages", items: ["Python", "Java", "JavaScript", "SQL"] },
    { id: "s2", category: "Frameworks", items: ["React", "Node.js", "Express"] },
    { id: "s3", category: "Soft Skills", items: ["Communication", "Team Collaboration"] },
  ],
  certifications: [{ id: "c1", name: "Full Stack Web Development", issuer: "Skill Guru", issueDate: "2024-03", credentialId: "SG-2024-0912", credentialUrl: "" }],
  achievements: [{ id: "a1", title: "Finalist, Smart India Hackathon", description: "Built a crop-price prediction prototype with a team of six.", organization: "Government of India", date: "2023" }],
  languages: [
    { id: "l1", name: "English", proficiency: "Fluent" },
    { id: "l2", name: "Hindi", proficiency: "Native" },
    { id: "l3", name: "Marathi", proficiency: "Native" },
  ],
  additional: [{ id: "ad1", kind: "volunteering", heading: "", title: "NSS Volunteer", organization: "National Service Scheme", date: "2023", description: "Organised a digital-literacy drive for 40 villagers." }],
};

const longTitle = "Senior Associate Software Engineer & Machine-Learning Platform Reliability Lead (Contract-to-Hire, Hybrid)";

/** Hostile and awkward input: LaTeX specials, injection attempts, diacritics, long strings, many entries, empty optionals. */
export const edgeCases = {
  personal: {
    fullName: "Zoë Ñúñez-D'Souza \\input{/etc/passwd}",
    headline: "100% committed | C# & C++ | $5k+ projects #1 {braces} ~tilde^ under_score",
    email: "zoe_nunez+cv@example.co.in",
    phone: "(+91) 98765-43210",
    city: "São Paulo",
    state: "",
    country: "Brasil",
    linkedin: "https://www.linkedin.com/in/zo%C3%AB-n%C3%BA%C3%B1ez_dsouza-1234567890abcdef/?originalSubdomain=in&utm_source=share#about",
    github: "javascript:alert(1)",
    portfolio: "not a url",
    website: "https://example.com/a_very/long/path/that/keeps/going/and/going/without/any/breaks/to/test/overflow/handling",
  },
  summary: { summary: "\\immediate\\write18{rm -rf /} }\\end{document} Paragraph one with -- double dashes and ``quotes''.\n\nParagraph two: ₹ 5,00,000 budget • bullet → arrow.", objective: "Objective with \\textbf{fake bold} and %comment and \\\\ line breaks." },
  education: [
    { id: "e1", institution: longTitle, degree: longTitle, specialization: "Artificial Intelligence & Data Science", location: "Bengaluru", startDate: "2019-07", endDate: "2023-06", current: false, cgpa: "9.1/10", percentage: "", coursework: "", details: "- Thesis: \\def\\x{y}\\x\n- Rank #3 of 120" },
    { id: "e2", institution: "", degree: "", specialization: "", location: "", startDate: "", endDate: "", current: false, cgpa: "", percentage: "", coursework: "", details: "" },
  ],
  experience: Array.from({ length: 5 }, (_, i) => ({
    id: `x${i}`,
    kind: i % 2 ? "internship" : "job",
    title: i === 0 ? longTitle : `Engineer ${i + 1}`,
    organization: `Company_${i + 1} & Sons {Pvt} Ltd`,
    employmentType: "Full-time",
    location: i === 0 ? "" : "Mumbai",
    startDate: `20${18 + i}-01`,
    endDate: i === 4 ? "" : `20${19 + i}-01`,
    current: i === 4,
    responsibilities: `Item with 50% & $ signs ${i}\nVery long bullet ${"lorem ".repeat(40)}end`,
    achievements: i === 0 ? "^^5cinput{/etc/passwd}" : "",
    technologies: i === 0 ? ["C#", "C++", "Node.js", "TypeScript", "PostgreSQL", "Kubernetes", "Terraform", "Apache Kafka"] : [],
  })),
  projects: [
    { id: "p1", name: "Project_With_Underscores & {Braces}", type: "", description: "", technologies: [], features: "", contributions: "", repoUrl: "https://github.com/a/b_c?x=1#y", liveUrl: "https://demo.example.com/~user/%7Bpath%7D" },
    { id: "p2", name: "", description: "", technologies: [], features: "", contributions: "", repoUrl: "", liveUrl: "" },
  ],
  skills: [
    { id: "s1", category: "Langs & Tools", items: ["C#", "C++", "F#", "R", "Go", "Rust", "Kotlin", "Swift", "Dart", "Elixir", "Haskell", "OCaml", "Scala", "Clojure", "Julia"] },
    { id: "s2", category: "Empty group", items: [] },
  ],
  certifications: [{ id: "c1", name: "AWS Certified Cloud Practitioner", issuer: "", issueDate: "", credentialId: "", credentialUrl: "https://aws.amazon.com/verification?id=ABC_123&x=%20" }],
  achievements: [],
  languages: [{ id: "l1", name: "Português", proficiency: "" }],
  additional: [
    { id: "a1", kind: "custom", heading: "Open Source & Community", title: "Maintainer", organization: "", date: "", description: "" },
    { id: "a2", kind: "custom", heading: "", title: "Speaker, PyCon India", organization: "PSF", date: "2024-09", description: "Talk on testing." },
  ],
};

export const minimal = {
  personal: { fullName: "Riya Patel", email: "riya@example.com", phone: "+91 90000 00000" },
  skills: [{ id: "s1", category: "Skills", items: ["Excel"] }],
};

export const FIXTURES = { typicalStudent, edgeCases, minimal } as const;
