export interface CourseItem {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  duration: string;
  skills: string[];
  isFeatured2026?: boolean;
  price: number;
  oldPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  mentor: string;
  mentorRole: string;
  mentorAvatar: string;
  badge?: string;
  summary: string;
}

export const coursesData: CourseItem[] = [
  // 1. Emerging Tech & AI
  {
    id: "ai-eng",
    name: "AI Engineering",
    category: "Emerging Tech & AI",
    categoryId: "emergingTechAI",
    duration: "6 Months",
    skills: ["Python", "PyTorch", "Transformers", "Neural Networks"],
    price: 49999,
    oldPrice: 74999,
    discount: "Save 33%",
    rating: 4.9,
    reviews: 240,
    mentor: "Rahul Sharma",
    mentorRole: "Senior Data Scientist",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    badge: "Trending",
    summary: "Master deep learning, foundational models, and deploy production-grade AI systems."
  },
  {
    id: "fs-ai-dev",
    name: "Full Stack AI Development",
    category: "Emerging Tech & AI",
    categoryId: "emergingTechAI",
    duration: "6 Months",
    skills: ["OpenAI API", "React", "NodeJS", "FastAPI"],
    price: 54999,
    oldPrice: 79999,
    discount: "Save 31%",
    rating: 4.8,
    reviews: 180,
    mentor: "Neha Verma",
    mentorRole: "Product Manager",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    badge: "Popular",
    summary: "Integrate LLMs, vector search, and agentic layers into standard React-Node applications."
  },
  {
    id: "agentic-ai-arch",
    name: "Agentic AI Architecture",
    category: "Emerging Tech & AI",
    categoryId: "emergingTechAI",
    duration: "4 Months",
    skills: ["LangChain", "CrewAI", "AutoGen", "Multi-Agent Systems"],
    price: 39999,
    oldPrice: 59999,
    discount: "Save 33%",
    rating: 4.95,
    reviews: 120,
    mentor: "Amit Singh",
    mentorRole: "Solutions Architect",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    badge: "Hot",
    summary: "Build autonomous multi-agent systems that perform complex workflow routing."
  },

  // 2. Data Science & Analytics
  {
    id: "data-science-spec",
    name: "Data Science Specialist",
    category: "Data Science & Analytics",
    categoryId: "dataScienceAnalytics",
    duration: "6 Months",
    skills: ["Pandas", "Scikit-Learn", "SQL", "Statistics"],
    price: 49999,
    oldPrice: 69999,
    discount: "Save 28%",
    rating: 4.8,
    reviews: 320,
    mentor: "Rahul Sharma",
    mentorRole: "Senior Data Scientist",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    summary: "Master predictive models, quantitative statistical analytics, and feature engineering."
  },

  // 3. Design & Product
  {
    id: "uiux-masterclass",
    name: "UI/UX Design Masterclass",
    category: "Design & Product",
    categoryId: "designProduct",
    duration: "4 Months",
    skills: ["Figma", "Design Systems", "Prototyping", "UX Research"],
    price: 34999,
    oldPrice: 49999,
    discount: "Save 30%",
    rating: 4.9,
    reviews: 215,
    mentor: "Pooja Rao",
    mentorRole: "Senior UI/UX Designer",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Design responsive interfaces, conduct user research, and build complete Figma libraries."
  },

  // 4. Marketing & Content
  {
    id: "growth-marketing-cert",
    name: "Growth Marketing Certification",
    category: "Marketing & Content",
    categoryId: "marketingContent",
    duration: "4 Months",
    skills: ["Google Analytics", "SEM", "Funnels", "Growth Loops"],
    price: 24999,
    oldPrice: 39999,
    discount: "Save 38%",
    rating: 4.7,
    reviews: 145,
    mentor: "Simran Kaur",
    mentorRole: "Growth Marketing Lead",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Scale acquisition, build analytical funnels, and optimize retention cycles."
  },

  // 5. Finance & Fintech
  {
    id: "fintech-innovation",
    name: "Fintech Innovation & Blockchain",
    category: "Finance & Fintech",
    categoryId: "financeFintech",
    duration: "4 Months",
    skills: ["DeFi", "Smart Contracts", "APIs", "Digital Banking"],
    price: 36999,
    oldPrice: 54999,
    discount: "Save 33%",
    rating: 4.8,
    reviews: 95,
    mentor: "Amit Singh",
    mentorRole: "Solutions Architect",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    summary: "Analyze Decentralized Finance, verify blockchain transactions, and build payment APIs."
  },

  // 6. Management & Strategy
  {
    id: "strategic-leadership",
    name: "Strategic Business Leadership",
    category: "Management & Strategy",
    categoryId: "managementStrategy",
    duration: "5 Months",
    skills: ["Strategy formulation", "KPIs", "Venture Capital", "Corporate finance"],
    price: 45000,
    oldPrice: 65000,
    discount: "Save 30%",
    rating: 4.85,
    reviews: 110,
    mentor: "Rahul Sharma",
    mentorRole: "Senior Data Scientist",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    summary: "Lead organizational pivots, construct balanced scorecards, and outline strategic directions."
  },

  // 7. Human Resources & Talent
  {
    id: "hr-analytics-specialist",
    name: "HR Analytics Specialist",
    category: "Human Resources & Talent",
    categoryId: "hrTalent",
    duration: "4 Months",
    skills: ["Excel", "Tableau", "Talent Metrics", "Retention Logic"],
    price: 29999,
    oldPrice: 44999,
    discount: "Save 33%",
    rating: 4.75,
    reviews: 88,
    mentor: "Pooja Rao",
    mentorRole: "HR Operations Lead",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Apply quantitative metrics to hiring models, optimize attrition indices, and scale teams."
  },

  // 8. Healthcare & Life Sciences
  {
    id: "clinical-data-mgmt",
    name: "Clinical Data Management",
    category: "Healthcare & Life Sciences",
    categoryId: "healthcareLifeSciences",
    duration: "6 Months",
    skills: ["Clinical Trials", "CDISC Standards", "SAS Programming", "FDA Auditing"],
    price: 42999,
    oldPrice: 59999,
    discount: "Save 28%",
    rating: 4.9,
    reviews: 75,
    mentor: "Rahul Sharma",
    mentorRole: "Healthcare Consultant",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    summary: "Validate pharmaceutical trial databases, ensure standard compliance, and pass FDA regulations."
  },

  // 9. Creator Economy & AI Business
  {
    id: "ai-creator-business",
    name: "AI-Powered Creator Business",
    category: "Creator Economy & AI Business",
    categoryId: "creatorEconomy",
    duration: "4 Months",
    skills: ["Midjourney", "ElevenLabs", "Premiere", "Direct-to-Consumer Branding"],
    price: 19999,
    oldPrice: 29999,
    discount: "Save 33%",
    rating: 4.8,
    reviews: 130,
    mentor: "Simran Kaur",
    mentorRole: "Growth Architect",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Build an audience, scale multi-media content with AI engines, and optimize sponsorship revenue."
  },

  // 10. Future-Proof Courses (2030 Horizon)
  {
    id: "metaverse-strategy",
    name: "Metaverse & Spatial Computing Strategy",
    category: "Future-Proof Courses (2030 Horizon)",
    categoryId: "futureProof2030",
    duration: "6 Months",
    skills: ["Spatial Audio", "Unity", "Unreal Engine", "Web3 Economics"],
    price: 49999,
    oldPrice: 79999,
    discount: "Save 38%",
    rating: 4.85,
    reviews: 64,
    mentor: "Amit Singh",
    mentorRole: "Solutions Architect",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    summary: "Formulate product strategies for mixed reality devices, immersive systems, and digital assets."
  },

  // 11. Autonomous Systems & Spatial Computing
  {
    id: "robotics-software-eng",
    name: "Robotics Software Engineering",
    category: "Autonomous Systems & Spatial Computing",
    categoryId: "autonomousSpatial",
    duration: "6 Months",
    skills: ["ROS2", "C++", "Slam", "Path Planning"],
    price: 54999,
    oldPrice: 79999,
    discount: "Save 31%",
    rating: 4.9,
    reviews: 58,
    mentor: "Rahul Sharma",
    mentorRole: "Robotics Specialist",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    summary: "Write software for physical robots, map autonomous behaviors, and orchestrate SLAM pathways."
  },

  // 12. Synthetic Media & Digital Twins
  {
    id: "digital-twins-arch",
    name: "Digital Twin Architectures",
    category: "Synthetic Media & Digital Twins",
    categoryId: "syntheticDigitalTwins",
    duration: "5 Months",
    skills: ["IoT Systems", "NVIDIA Omniverse", "Sensors Data", "3D CAD Rendering"],
    price: 45999,
    oldPrice: 64999,
    discount: "Save 29%",
    rating: 4.8,
    reviews: 42,
    mentor: "Amit Singh",
    mentorRole: "Systems Specialist",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    summary: "Build virtual replicas of physical factory systems, coordinate real-time IoT feeds, and test outcomes."
  },

  // 13. AI Governance & Safety
  {
    id: "ai-ethics-safety",
    name: "AI Governance & Safety",
    category: "AI Governance & Safety",
    categoryId: "aiSafety",
    duration: "4 Months",
    skills: ["Risk frameworks", "Regulatory audit", "EU AI Act", "Bias Mitigation"],
    price: 34999,
    oldPrice: 49999,
    discount: "Save 30%",
    rating: 4.95,
    reviews: 78,
    mentor: "Neha Verma",
    mentorRole: "Governance Lead",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Ensure ethical alignments, pass EU regulatory audits, and build biases screening tools."
  },

  // 14. Bio-Tech & Health Tech
  {
    id: "bioinformatics-genomics",
    name: "Bioinformatics & Genomics",
    category: "Bio-Tech & Health Tech",
    categoryId: "bioTechHealthTech",
    duration: "6 Months",
    skills: ["Python", "R", "Sequence Analysis", "Biostatistics"],
    price: 49999,
    oldPrice: 74999,
    discount: "Save 33%",
    rating: 4.88,
    reviews: 62,
    mentor: "Rahul Sharma",
    mentorRole: "Bio-Tech Advisor",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    summary: "Analyze DNA/RNA sequences using custom computational models and python packages."
  },

  // 15. Climate Tech & Sustainability
  {
    id: "carbon-accounting-esg",
    name: "Carbon Accounting & Sustainability",
    category: "Climate Tech & Sustainability",
    categoryId: "climateTech",
    duration: "4 Months",
    skills: ["ESG Audit", "GHG Protocols", "Lifecycle Analysis", "Green Finance"],
    price: 29999,
    oldPrice: 42999,
    discount: "Save 30%",
    rating: 4.75,
    reviews: 90,
    mentor: "Simran Kaur",
    mentorRole: "Climate Strategist",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Formulate corporate carbon reduction matrices and audit ESG compliance portfolios."
  },

  // 16. Quantum & Deep Tech
  {
    id: "quantum-computing-algo",
    name: "Quantum Computing Algorithms",
    category: "Quantum & Deep Tech",
    categoryId: "quantumDeepTech",
    duration: "6 Months",
    skills: ["Qiskit", "Quantum Gates", "Linear Algebra", "Python"],
    price: 54999,
    oldPrice: 79999,
    discount: "Save 31%",
    rating: 4.9,
    reviews: 36,
    mentor: "Amit Singh",
    mentorRole: "Solutions Architect",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    summary: "Write scripts for IBM Quantum machines, model quantum registers, and optimize gates."
  },

  // 17. Human-AI Collaboration Strategy
  {
    id: "human-ai-collaboration",
    name: "Human-AI Collaboration Strategy",
    category: "Human-AI Collaboration Strategy",
    categoryId: "humanAIStrategy",
    duration: "4 Months",
    skills: ["Prompt engineering", "Ergonomics", "SaaS automation", "Workflow design"],
    price: 24999,
    oldPrice: 34999,
    discount: "Save 28%",
    rating: 4.8,
    reviews: 115,
    mentor: "Simran Kaur",
    mentorRole: "AI Productivity Coach",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Integrate generative agents into corporate workplaces, reducing task cycle time by 60%."
  },

  // 18. Fintech Evolution & Digital Web
  {
    id: "web3-fintech-apps",
    name: "Fintech Evolution & Digital Web",
    category: "Fintech Evolution & Digital Web",
    categoryId: "fintechDigitalWeb",
    duration: "5 Months",
    skills: ["Ethereum SDK", "Solidity", "REST APIs", "Cryptographic Ledgers"],
    price: 39999,
    oldPrice: 59999,
    discount: "Save 33%",
    rating: 4.88,
    reviews: 82,
    mentor: "Amit Singh",
    mentorRole: "Blockchain Lead",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    summary: "Develop decentralized applications, audit smart contracts, and hook up bank API networks."
  },

  // 19. Next-Gen Media & Creator Growth
  {
    id: "nextgen-media-strategy",
    name: "Next-Gen Media & Creator Growth",
    category: "Next-Gen Media & Creator Growth",
    categoryId: "mediaCreatorGrowth",
    duration: "4 Months",
    skills: ["SEO", "TikTok Algorithms", "Dynamic Video Editing", "Podcasting Systems"],
    price: 19999,
    oldPrice: 29999,
    discount: "Save 33%",
    rating: 4.75,
    reviews: 160,
    mentor: "Simran Kaur",
    mentorRole: "Growth Architect",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Construct viral campaigns, orchestrate production systems, and launch creator channels."
  },

  // 20. Future Enterprise Operations
  {
    id: "future-enterprise-ops",
    name: "Future Enterprise Operations",
    category: "Future Enterprise Operations",
    categoryId: "futureEnterprise",
    duration: "5 Months",
    skills: ["RPA", "SAP Systems", "Logistics logic", "AI Orchestrations"],
    price: 36000,
    oldPrice: 49999,
    discount: "Save 28%",
    rating: 4.8,
    reviews: 94,
    mentor: "Pooja Rao",
    mentorRole: "Operations Expert",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Optimize business process flows, deploy automation macros, and streamline logistics."
  },

  // 21. Healthcare & Medical (Contains High-Demand Featured Courses)
  {
    id: "medical-coding-cert",
    name: "Medical Coding",
    category: "Healthcare & Medical",
    categoryId: "healthcareMedical",
    duration: "6 Months",
    skills: ["ICD-10", "CPT Codes", "HCPCS", "Anatomy & Physiology"],
    price: 29999,
    oldPrice: 44999,
    discount: "Save 33%",
    rating: 4.9,
    reviews: 520,
    mentor: "Dr. Anjali Deshmukh",
    mentorRole: "Health Informatics Lead",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    badge: "Trending",
    isFeatured2026: true,
    summary: "Become a certified medical coder. Code medical diagnostics under ICD-10 regulatory systems."
  },
  {
    id: "hospital-admin-cert",
    name: "Hospital Administration",
    category: "Healthcare & Medical",
    categoryId: "healthcareMedical",
    duration: "6 Months",
    skills: ["Operations", "Healthcare Billing", "Patient Care Systems", "Compliance"],
    price: 32000,
    oldPrice: 48000,
    discount: "Save 33%",
    rating: 4.8,
    reviews: 310,
    mentor: "Dr. Anjali Deshmukh",
    mentorRole: "Healthcare Director",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    badge: "Bestseller",
    isFeatured2026: true,
    summary: "Manage operational pathways in modern hospitals, coordinate clinical workflows and staff."
  },
  {
    id: "clinical-research-cert",
    name: "Clinical Research",
    category: "Healthcare & Medical",
    categoryId: "healthcareMedical",
    duration: "6 Months",
    skills: ["Clinical Trials", "ICH-GCP Guidelines", "Pharmacovigilance", "SOPs"],
    price: 34999,
    oldPrice: 49999,
    discount: "Save 30%",
    rating: 4.85,
    reviews: 290,
    mentor: "Dr. Amit Deshmukh",
    mentorRole: "Senior Clinical Scientist",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    badge: "High Demand",
    isFeatured2026: true,
    summary: "Orchestrate clinical trial databases, ensure GCP standard parameters, and manage drugs trials."
  },
  {
    id: "medical-billing-cert",
    name: "Medical Billing",
    category: "Healthcare & Medical",
    categoryId: "healthcareMedical",
    duration: "4 Months",
    skills: ["CMS-1500", "Claim Audits", "Payment Posting", "Insurance Claims"],
    price: 24999,
    oldPrice: 34999,
    discount: "Save 28%",
    rating: 4.75,
    reviews: 140,
    mentor: "Dr. Anjali Deshmukh",
    mentorRole: "Billing Expert",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "File healthcare claims under CMS parameters, process billing pipelines, and reduce rejection indices."
  },

  // 22. Business & Management
  {
    id: "event-mgmt-cert",
    name: "Event Management",
    category: "Business & Management",
    categoryId: "businessManagement",
    duration: "4 Months",
    skills: ["Vendor Management", "Budgeting", "Sponsorships", "Event Logistics"],
    price: 21999,
    oldPrice: 29999,
    discount: "Save 26%",
    rating: 4.8,
    reviews: 195,
    mentor: "Pooja Rao",
    mentorRole: "Operations Lead",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Popular",
    summary: "Plan, design, and execute corporate events, product launches, and major conventions."
  },
  {
    id: "supply-chain-mgmt-cert",
    name: "Supply Chain Management",
    category: "Business & Management",
    categoryId: "businessManagement",
    duration: "6 Months",
    skills: ["Logistics", "Inventory Systems", "Procurement", "Operations"],
    price: 34999,
    oldPrice: 49999,
    discount: "Save 30%",
    rating: 4.85,
    reviews: 260,
    mentor: "Rahul Sharma",
    mentorRole: "Supply Chain Advisor",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "High Demand",
    summary: "Orchestrate production schedules, manage vendor systems, and control freight pathways."
  },

  // 23. Finance & Accounting
  {
    id: "stock-market-finance",
    name: "Stock Market & Finance",
    category: "Finance & Accounting",
    categoryId: "financeAccounting",
    duration: "4 Months",
    skills: ["Technical Analysis", "Fundamental Analysis", "Option Trading", "Portfolio Management"],
    price: 24999,
    oldPrice: 39999,
    discount: "Save 38%",
    rating: 4.9,
    reviews: 450,
    mentor: "Amit Singh",
    mentorRole: "Equity Research Analyst",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Trending",
    summary: "Master equity research, option trading, asset classes, and personal financial planning."
  },
  {
    id: "gst-taxation-cert",
    name: "GST & Taxation",
    category: "Finance & Accounting",
    categoryId: "financeAccounting",
    duration: "4 Months",
    skills: ["GST Returns", "Income Tax", "Tally Prime", "Corporate Tax Audit"],
    price: 22999,
    oldPrice: 32999,
    discount: "Save 30%",
    rating: 4.8,
    reviews: 380,
    mentor: "Rahul Sharma",
    mentorRole: "Chartered Accountant",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Bestseller",
    summary: "File GST filings, process direct and indirect corporate taxes, and balance business ledgers."
  },

  // 24. Marketing & Sales
  {
    id: "digital-marketing-cert",
    name: "Digital Marketing",
    category: "Marketing & Sales",
    categoryId: "marketingSales",
    duration: "4 Months",
    skills: ["SEO", "SEM", "Google Analytics", "Social Media Ads"],
    price: 24999,
    oldPrice: 39999,
    discount: "Save 38%",
    rating: 4.8,
    reviews: 580,
    mentor: "Simran Kaur",
    mentorRole: "Growth Strategist",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Hot",
    summary: "Formulate paid campaigns, run search optimizations, and measure performance indices."
  },

  // 25. Human Resources
  {
    id: "hr-management-cert",
    name: "Human Resource Management",
    category: "Human Resources",
    categoryId: "humanResources",
    duration: "4 Months",
    skills: ["HR Generalist", "Payroll Management", "Labour Laws", "Employee Relations"],
    price: 24999,
    oldPrice: 34999,
    discount: "Save 28%",
    rating: 4.85,
    reviews: 410,
    mentor: "Pooja Rao",
    mentorRole: "HR Operations Lead",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Popular",
    summary: "Manage corporate payroll cycles, navigate labour laws, and coordinate onboarding pipelines."
  },

  // 26. Design & Creative Arts
  {
    id: "graphic-design-cert",
    name: "Graphic Design",
    category: "Design & Creative Arts",
    categoryId: "designCreativeArts",
    duration: "4 Months",
    skills: ["Photoshop", "Illustrator", "InDesign", "Visual Layouts"],
    price: 19999,
    oldPrice: 29999,
    discount: "Save 33%",
    rating: 4.8,
    reviews: 320,
    mentor: "Simran Kaur",
    mentorRole: "Design Principal",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Bestseller",
    summary: "Design marketing banners, branding assets, corporate vectors, and master vector art."
  },
  {
    id: "interior-design-cert",
    name: "Interior Design",
    category: "Design & Creative Arts",
    categoryId: "designCreativeArts",
    duration: "6 Months",
    skills: ["AutoCAD", "SketchUp", "3D Rendering", "Space Planning"],
    price: 34999,
    oldPrice: 49999,
    discount: "Save 30%",
    rating: 4.85,
    reviews: 195,
    mentor: "Amit Singh",
    mentorRole: "Spatial Designer",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Highly Popular",
    summary: "Design corporate interiors, draw architectural wireframes, and model virtual spaces."
  },

  // 27. Media & Content Creation
  {
    id: "content-creation-cert",
    name: "Content Creation",
    category: "Media & Content Creation",
    categoryId: "mediaContentCreation",
    duration: "4 Months",
    skills: ["Scriptwriting", "Videography", "Premiere Pro", "Channel Growth"],
    price: 19999,
    oldPrice: 29999,
    discount: "Save 33%",
    rating: 4.85,
    reviews: 290,
    mentor: "Simran Kaur",
    mentorRole: "Creative Director",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Trending",
    summary: "Script, record, and edit professional video, audio, and visual assets for digital channels."
  },

  // 28. Hospitality & Tourism
  {
    id: "aviation-cabin-crew",
    name: "Aviation & Cabin Crew",
    category: "Hospitality & Tourism",
    categoryId: "hospitalityTourism",
    duration: "6 Months",
    skills: ["Cabin safety", "Customer Relations", "Communication", "Grooming standards"],
    price: 39999,
    oldPrice: 59999,
    discount: "Save 33%",
    rating: 4.9,
    reviews: 280,
    mentor: "Pooja Rao",
    mentorRole: "Aviation Lead",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Trending",
    summary: "Get trained for airline operations, safety protocols, passenger coordination, and cabin etiquette."
  },

  // 29. Education & Training
  {
    id: "instructional-design-cert",
    name: "Instructional Design",
    category: "Education & Training",
    categoryId: "educationTraining",
    duration: "4 Months",
    skills: ["Curriculum mapping", "LMS Systems", "E-learning strategy"],
    price: 24999,
    oldPrice: 34999,
    discount: "Save 28%",
    rating: 4.75,
    reviews: 92,
    mentor: "Pooja Rao",
    mentorRole: "Education Advisor",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    summary: "Design digital coursework pathways, organize LMS systems, and outline educational objectives."
  },

  // 30. Law & Compliance
  {
    id: "corporate-law-compliance",
    name: "Corporate Law & Compliance",
    category: "Law & Compliance",
    categoryId: "lawCompliance",
    duration: "5 Months",
    skills: ["Contract drafting", "Labour regulations", "IP laws", "Governance"],
    price: 32000,
    oldPrice: 45000,
    discount: "Save 29%",
    rating: 4.8,
    reviews: 80,
    mentor: "Rahul Sharma",
    mentorRole: "Legal Consultant",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    summary: "Audit legal risk indices, draft commercial agreements, and ensure labor compliance."
  },

  // 31. Agriculture & Environment
  {
    id: "sustainable-agritech",
    name: "Sustainable Agriculture & Agri-Tech",
    category: "Agriculture & Environment",
    categoryId: "agricultureEnvironment",
    duration: "6 Months",
    skills: ["Agri-Tech Sensors", "Sustainable Soil Care", "Hydroponics", "GIS Data"],
    price: 29999,
    oldPrice: 42999,
    discount: "Save 30%",
    rating: 4.75,
    reviews: 65,
    mentor: "Amit Singh",
    mentorRole: "Agricultural Analyst",
    mentorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop",
    summary: "Optimize modern crop cycles with agri-tech sensors, smart watering schedules, and organic farming."
  },

  // 32. Government & Competitive Exams
  {
    id: "upsc-mpsc-banking-prep",
    name: "UPSC/MPSC/Banking Preparation",
    category: "Government & Competitive Exams",
    categoryId: "governmentExams",
    duration: "12 Months",
    skills: ["General Studies", "Quantitative Aptitude", "Verbal Reasoning", "Current Affairs"],
    price: 49999,
    oldPrice: 79999,
    discount: "Save 38%",
    rating: 4.9,
    reviews: 740,
    mentor: "Rahul Sharma",
    mentorRole: "Academic Dean",
    mentorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Trending",
    summary: "Clear state civil services exams, banking tests, aptitude reviews, and current affairs analysis."
  },

  // 14. Bio-Tech & Health Tech (Featured Option)
  {
    id: "nutrition-dietetics",
    name: "Nutrition & Dietetics",
    category: "Bio-Tech & Health Tech",
    categoryId: "bioTechHealthTech",
    duration: "4 Months",
    skills: ["Clinical Nutrition", "Diet Planning", "Biochemistry", "Counseling"],
    price: 24999,
    oldPrice: 34999,
    discount: "Save 28%",
    rating: 4.8,
    reviews: 110,
    mentor: "Dr. Anjali Deshmukh",
    mentorRole: "Nutrition Consultant",
    mentorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=128&auto=format&fit=crop",
    isFeatured2026: true,
    badge: "Trending",
    summary: "Create healthy metabolic schedules, analyze biochemistries, and practice dietary consultations."
  }
];

export const courseCategoriesList = [
  { id: "emergingTechAI", name: "Emerging Tech & AI", iconName: "BrainCircuit" },
  { id: "dataScienceAnalytics", name: "Data Science & Analytics", iconName: "BarChart3" },
  { id: "designProduct", name: "Design & Product", iconName: "Palette" },
  { id: "marketingContent", name: "Marketing & Content", iconName: "MessageCircle" },
  { id: "financeFintech", name: "Finance & Fintech", iconName: "DollarSign" },
  { id: "managementStrategy", name: "Management & Strategy", iconName: "TrendingUp" },
  { id: "hrTalent", name: "Human Resources & Talent", iconName: "Users" },
  { id: "healthcareLifeSciences", name: "Healthcare & Life Sciences", iconName: "Heart" },
  { id: "creatorEconomy", name: "Creator Economy & AI Business", iconName: "Sparkles" },
  { id: "futureProof2030", name: "Future-Proof Courses (2030 Horizon)", iconName: "Rocket" },
  { id: "autonomousSpatial", name: "Autonomous Systems & Spatial Computing", iconName: "Layers" },
  { id: "syntheticDigitalTwins", name: "Synthetic Media & Digital Twins", iconName: "Image" },
  { id: "aiSafety", name: "AI Governance & Safety", iconName: "ShieldCheck" },
  { id: "bioTechHealthTech", name: "Bio-Tech & Health Tech", iconName: "Activity" },
  { id: "climateTech", name: "Climate Tech & Sustainability", iconName: "Globe" },
  { id: "quantumDeepTech", name: "Quantum & Deep Tech", iconName: "Cpu" },
  { id: "humanAIStrategy", name: "Human-AI Collaboration Strategy", iconName: "Handshake" },
  { id: "fintechDigitalWeb", name: "Fintech Evolution & Digital Web", iconName: "CreditCard" },
  { id: "mediaCreatorGrowth", name: "Next-Gen Media & Creator Growth", iconName: "Video" },
  { id: "futureEnterprise", name: "Future Enterprise Operations", iconName: "Briefcase" },
  { id: "healthcareMedical", name: "Healthcare & Medical", iconName: "Activity" },
  { id: "businessManagement", name: "Business & Management", iconName: "Briefcase" },
  { id: "financeAccounting", name: "Finance & Accounting", iconName: "DollarSign" },
  { id: "marketingSales", name: "Marketing & Sales", iconName: "TrendingUp" },
  { id: "humanResources", name: "Human Resources", iconName: "Users" },
  { id: "designCreativeArts", name: "Design & Creative Arts", iconName: "Palette" },
  { id: "mediaContentCreation", name: "Media & Content Creation", iconName: "MessageCircle" },
  { id: "hospitalityTourism", name: "Hospitality & Tourism", iconName: "Plane" },
  { id: "educationTraining", name: "Education & Training", iconName: "GraduationCap" },
  { id: "lawCompliance", name: "Law & Compliance", iconName: "FileCheck" },
  { id: "agricultureEnvironment", name: "Agriculture & Environment", iconName: "Leaf" },
  { id: "governmentExams", name: "Government & Competitive Exams", iconName: "Award" },
];
