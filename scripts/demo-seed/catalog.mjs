// Static reference data for the demo-course seeder.

export const DEMO_TAG = { name: "Demo content", slug: "demo-content" };

// Top-level groups. `design-creative` already exists in the production
// taxonomy (20260806000002_seed_category_taxonomy.sql) and is reused as-is;
// the seeder only inserts groups whose slug is missing.
export const CATEGORY_GROUPS = [
  { slug: "technology", name: "Technology & IT", icon: "Cpu", description: "Software, data, security and cloud skills for the modern tech industry." },
  { slug: "business-management", name: "Business & Management", icon: "Briefcase", description: "Marketing, entrepreneurship, finance and professional skills." },
  { slug: "design-creative", name: "Design & Creative", icon: "Palette", description: "Visual, product and creative design disciplines." },
];

// The ten marketplace categories used by the demo catalogue.
export const CATEGORIES = [
  { slug: "web-development", name: "Web Development", group: "technology", icon: "Globe", description: "Front-end, back-end and full-stack web engineering." },
  { slug: "data-science-ai", name: "Data Science & AI", group: "technology", icon: "BrainCircuit", description: "Analytics, machine learning and generative AI." },
  { slug: "programming", name: "Programming", group: "technology", icon: "Code", description: "Programming languages, algorithms and software craftsmanship." },
  { slug: "cybersecurity", name: "Cybersecurity", group: "technology", icon: "ShieldCheck", description: "Defensive security, ethical hacking and compliance." },
  { slug: "cloud-devops", name: "Cloud Computing & DevOps", group: "technology", icon: "Cloud", description: "Cloud platforms, containers, automation and reliability." },
  { slug: "ui-ux-design", name: "UI/UX Design", group: "design-creative", icon: "PenTool", description: "User research, interface design and design systems." },
  { slug: "digital-marketing", name: "Digital Marketing", group: "business-management", icon: "Megaphone", description: "SEO, social, paid media, content and analytics." },
  { slug: "business-entrepreneurship", name: "Business & Entrepreneurship", group: "business-management", icon: "Rocket", description: "Startups, product management, strategy and leadership." },
  { slug: "finance-management", name: "Finance & Management", group: "business-management", icon: "LineChart", description: "Accounting, financial modelling and project management." },
  { slug: "communication-career-skills", name: "Communication & Career Skills", group: "business-management", icon: "MessagesSquare", description: "Communication, interviews and career planning." },
];

const DISCLAIMER =
  "This is a demonstration instructor profile created for SkillGuru platform review. It does not represent a real person, and the account cannot sign in.";

// One fictional, clearly-labelled demo instructor per category.
export const INSTRUCTORS = [
  { category: "web-development", email: "demo.instructor.webdev@skillguru.local", name: "Arjun Mehta", city: "Bengaluru", years: 9, expertise: ["React", "Node.js", "TypeScript", "Web Performance"], focus: "full-stack web engineering" },
  { category: "data-science-ai", email: "demo.instructor.data@skillguru.local", name: "Priya Raghavan", city: "Hyderabad", years: 8, expertise: ["Python", "Machine Learning", "Generative AI", "SQL"], focus: "data science and applied AI" },
  { category: "programming", email: "demo.instructor.programming@skillguru.local", name: "Karthik Iyer", city: "Chennai", years: 11, expertise: ["Java", "C++", "Algorithms", "Software Design"], focus: "programming fundamentals and algorithms" },
  { category: "ui-ux-design", email: "demo.instructor.design@skillguru.local", name: "Sneha Kulkarni", city: "Pune", years: 7, expertise: ["Figma", "UX Research", "Design Systems", "Accessibility"], focus: "product and UX design" },
  { category: "digital-marketing", email: "demo.instructor.marketing@skillguru.local", name: "Rohan Malhotra", city: "Gurugram", years: 8, expertise: ["SEO", "Performance Marketing", "Analytics", "Content"], focus: "growth and digital marketing" },
  { category: "cybersecurity", email: "demo.instructor.security@skillguru.local", name: "Vikram Desai", city: "Mumbai", years: 10, expertise: ["Network Security", "Application Security", "Cloud Security", "GRC"], focus: "defensive cybersecurity" },
  { category: "business-entrepreneurship", email: "demo.instructor.business@skillguru.local", name: "Ananya Sharma", city: "New Delhi", years: 12, expertise: ["Product Management", "Strategy", "Leadership", "Startups"], focus: "product, strategy and entrepreneurship" },
  { category: "cloud-devops", email: "demo.instructor.cloud@skillguru.local", name: "Aditya Rao", city: "Bengaluru", years: 9, expertise: ["AWS", "Kubernetes", "Terraform", "SRE"], focus: "cloud engineering and DevOps" },
  { category: "finance-management", email: "demo.instructor.finance@skillguru.local", name: "Meera Joshi", city: "Mumbai", years: 10, expertise: ["Financial Modelling", "Accounting", "Corporate Finance", "Excel"], focus: "finance and management" },
  { category: "communication-career-skills", email: "demo.instructor.career@skillguru.local", name: "Nisha Verma", city: "Kolkata", years: 8, expertise: ["Business Communication", "Interview Coaching", "Career Planning"], focus: "communication and career development" },
].map((inst) => ({
  ...inst,
  headline: `Demo instructor profile · ${inst.focus}`,
  bio: `${DISCLAIMER} Courses attributed to this profile cover ${inst.focus}.`,
}));
