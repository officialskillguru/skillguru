// Fictional reference data for the end-to-end simulation seed (scripts/demo-sim/seed.mjs).
// Every person, course, price and payment here is made up for demonstration.

export const SIM_DOMAIN = "demo.skillguru.local";

export const ACCOUNTS = [
  {
    label: "Counsellor",
    role: "counsellor",
    email: `counsellor.meera@${SIM_DOMAIN}`,
    name: "Meera Iyer",
    phone: "9820012345",
    city: "Mumbai",
    state: "Maharashtra",
  },
  {
    label: "Teacher (assigned)",
    role: "mentor",
    email: `teacher.vikram@${SIM_DOMAIN}`,
    name: "Vikram Sethi",
    phone: "9811122334",
    city: "Bengaluru",
    state: "Karnataka",
    headline: "Senior Data & Full-Stack Engineer · Simulation teacher",
    bio: "Fictional simulation teacher. Ten years building analytics platforms and web products for Indian fintech teams.",
    expertise: ["Python", "Power BI", "React", "Node.js"],
    years: 10,
  },
  {
    label: "Teacher (other course)",
    role: "mentor",
    email: `teacher.kavya@${SIM_DOMAIN}`,
    name: "Kavya Nair",
    phone: "9845098450",
    city: "Kochi",
    state: "Kerala",
    headline: "Product Designer · Simulation teacher",
    bio: "Fictional simulation teacher. Leads design systems work and mentors early-career UX designers.",
    expertise: ["Figma", "UX Research", "Design Systems"],
    years: 7,
  },
  {
    label: "Student (new buyer)",
    role: "student",
    email: `student.riya@${SIM_DOMAIN}`,
    name: "Riya Sharma",
    phone: "9876543210",
    city: "Pune",
    state: "Maharashtra",
  },
  {
    label: "Student (existing learner)",
    role: "student",
    email: `student.aditya@${SIM_DOMAIN}`,
    name: "Aditya Verma",
    phone: "9123456780",
    city: "Jaipur",
    state: "Rajasthan",
    purchases: [{ course: "fullstack", method: "upi" }],
  },
  {
    label: "Student (not enrolled)",
    role: "student",
    email: `student.neha@${SIM_DOMAIN}`,
    name: "Neha Joshi",
    phone: "9988776655",
    city: "Indore",
    state: "Madhya Pradesh",
  },
];

const VIKRAM = `teacher.vikram@${SIM_DOMAIN}`;
const KAVYA = `teacher.kavya@${SIM_DOMAIN}`;

export const COURSES = [
  {
    key: "analytics",
    status: "draft", // the counsellor publishes this one during the walkthrough
    teacher: VIKRAM,
    title: "Data Analytics with Python & Power BI",
    slug: "sim-data-analytics-python-power-bi",
    theme: "data-science-ai",
    categorySlug: "data-analytics",
    categoryName: "Data Analytics",
    level: "beginner",
    duration: "10 weeks",
    price: 14999,
    courseType: "Live Cohort",
    shortDescription: "Go from spreadsheets to dashboards: clean data with Python, model it, and tell the story in Power BI.",
    description:
      "A live, project-led programme for graduates and working professionals who want to move into analytics roles. You will learn to clean and explore real-world datasets with Python and pandas, write the SQL analysts use every day, and build interactive Power BI dashboards that business teams actually use. Every week includes a live class with your teacher, a guided project, and feedback on your work.",
    outcomes: [
      "Clean, reshape and explore datasets with Python and pandas",
      "Write analytical SQL with joins, window functions and CTEs",
      "Design interactive Power BI dashboards with DAX measures",
      "Present a portfolio-ready capstone analysis to a reviewer",
    ],
    requirements: ["Comfort with basic spreadsheet formulas", "A laptop that can run Power BI Desktop (Windows) or the Power BI web app"],
    syllabus: [
      { title: "Python for Analysts", summary: "Set up your toolkit and learn the Python you need for day-to-day analysis.", lessons: ["Notebook setup and Python basics", "pandas DataFrames", "Cleaning messy data"] },
      { title: "SQL for Analytics", summary: "Query relational data confidently and answer business questions.", lessons: ["SELECT, filters and joins", "Aggregations and window functions"] },
      { title: "Dashboards with Power BI", summary: "Model data and build dashboards stakeholders rely on.", lessons: ["Data modelling and relationships", "DAX measures", "Designing a sales dashboard"] },
      { title: "Capstone Project", summary: "Bring it together in a portfolio project reviewed by your teacher.", lessons: ["Scoping your analysis", "Presenting insights"] },
    ],
  },
  {
    key: "fullstack",
    status: "published",
    teacher: VIKRAM,
    title: "Full-Stack Web Development with React & Node.js",
    slug: "sim-full-stack-react-node",
    theme: "web-development",
    categorySlug: "web-development",
    categoryName: "Web Development",
    level: "intermediate",
    duration: "16 weeks",
    price: 24999,
    courseType: "Live Cohort",
    shortDescription: "Build and deploy production-style web apps with React, Node.js, Express and PostgreSQL.",
    description:
      "Learn to design, build and ship full-stack applications the way product teams do. You will build a React front end, a REST API with Node.js and Express, persist data in PostgreSQL, and deploy the whole stack. Live sessions every week, code reviews on your projects, and a final capstone you can show employers.",
    outcomes: ["Build component-driven UIs with React and TypeScript", "Design REST APIs with Express", "Model relational data in PostgreSQL", "Deploy and monitor a full-stack app"],
    requirements: ["Working knowledge of HTML, CSS and basic JavaScript"],
    syllabus: [
      { title: "Modern JavaScript & TypeScript", summary: "The language features you will use every day.", lessons: ["ES modules and async/await", "TypeScript essentials"] },
      { title: "React Front End", summary: "Component design, state and data fetching.", lessons: ["Components and props", "State and effects", "Data fetching patterns"] },
      { title: "APIs with Node.js", summary: "Build and secure a REST API.", lessons: ["Express routing", "Authentication with JWT"] },
    ],
  },
  {
    key: "uiux",
    status: "published",
    teacher: KAVYA,
    title: "UI/UX Design Fundamentals with Figma",
    slug: "sim-ui-ux-figma-fundamentals",
    theme: "ui-ux-design",
    categorySlug: "ui-ux-design",
    categoryName: "UI/UX Design",
    level: "beginner",
    duration: "8 weeks",
    price: 12499,
    courseType: "Live Cohort",
    shortDescription: "Research, wireframe and prototype product screens in Figma with a practising designer.",
    description:
      "A hands-on introduction to product design. You will run lightweight user research, turn findings into wireframes, and build interactive Figma prototypes using a shared design system. Weekly studio hours give you live feedback on your work.",
    outcomes: ["Plan and run short user interviews", "Create wireframes and user flows", "Build interactive Figma prototypes", "Apply accessibility basics to UI"],
    requirements: ["No prior design experience needed"],
    syllabus: [
      { title: "Design Thinking", summary: "Understand users before you design.", lessons: ["User interviews", "Personas and journeys"] },
      { title: "Figma Foundations", summary: "Work fast and consistently in Figma.", lessons: ["Frames, auto layout and components", "Prototyping interactions"] },
    ],
  },
  {
    key: "python",
    status: "published",
    teacher: VIKRAM,
    title: "Python Programming for Beginners",
    slug: "sim-python-for-beginners",
    theme: "programming",
    categorySlug: "programming",
    categoryName: "Programming",
    level: "beginner",
    duration: "6 weeks",
    price: 7999,
    courseType: "Self-paced + Live Doubt Sessions",
    shortDescription: "Learn to code from scratch with Python through small, practical projects.",
    description:
      "Start programming with Python even if you have never written code before. Short lessons, practical exercises and weekly live doubt-clearing sessions take you from variables to writing your own automation scripts.",
    outcomes: ["Write Python programs with functions and loops", "Work with files and data", "Automate a repetitive task"],
    requirements: ["None - complete beginners welcome"],
    syllabus: [
      { title: "Getting Started", summary: "Your first programs.", lessons: ["Variables and types", "Conditions and loops"] },
      { title: "Working with Data", summary: "Lists, dictionaries and files.", lessons: ["Collections", "Reading and writing files"] },
    ],
  },
];

// Class sessions. dayOffset is relative to "today" in IST at seed time; for
// today's sessions the start time is computed from the seed run so the demo
// always has an upcoming class.
export const SESSIONS = [
  {
    course: "fullstack",
    teacher: VIKRAM,
    title: "Live Session 4: REST APIs with Express",
    description: "Routing, validation and error handling for a production-style API.",
    dayOffset: -1,
    time: "19:00",
    durationMinutes: 90,
    status: "completed",
    attendedBy: [`student.aditya@${SIM_DOMAIN}`],
  },
  {
    course: "fullstack",
    teacher: VIKRAM,
    title: "Live Session 5: Authentication & JWT",
    description: "Sign-up, login and protecting routes with JSON Web Tokens.",
    dayOffset: 2,
    time: "19:00",
    durationMinutes: 90,
    status: "scheduled",
  },
  {
    course: "uiux",
    teacher: KAVYA,
    title: "Studio Hour: Wireframing in Figma",
    description: "Bring your wireframes for live feedback.",
    dayOffset: 0,
    startInMinutes: 120,
    durationMinutes: 60,
    status: "scheduled",
  },
];
