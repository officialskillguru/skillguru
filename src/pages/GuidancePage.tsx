import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BrainCircuit,
  Compass,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Map,
  Bot,
  Send,
  Loader2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { usePageMeta } from "@/hooks/usePageMeta";
import { usePremiumPageMotion } from "@/components/motion/usePremiumPageMotion";
import { courses } from "@/data/platform";
import { routes, courseDetailRoute } from "@/lib/routes";

// Define assessment types
type Question = {
  id: number;
  text: string;
  options: { value: string; label: string }[];
};

const questions: Question[] = [
  {
    id: 1,
    text: "What domain excites you the most?",
    options: [
      { value: "development", label: "Building apps & websites (Coding)" },
      { value: "data", label: "Analyzing numbers & machine learning (Data Science)" },
      { value: "design", label: "Visual layouts & user experience (UI/UX)" },
      { value: "cloud_ops", label: "Managing servers & automation (Cloud / DevOps)" },
      { value: "security", label: "Securing networks & ethical hacking (Cyber Security)" },
      { value: "business_marketing", label: "Digital marketing & business processes" },
    ],
  },
  {
    id: 2,
    text: "What is your current background?",
    options: [
      { value: "fresher", label: "Fresher / College Student" },
      { value: "non_tech", label: "Non-IT Professional looking to switch" },
      { value: "it_non_dev", label: "IT Professional (Support/QA/Testing) upgrading skills" },
      { value: "beginner", label: "Self-taught beginner with some basic knowledge" },
    ],
  },
  {
    id: 3,
    text: "How much time can you commit to learning per week?",
    options: [
      { value: "part_time", label: "Less than 15 hours (Part-time)" },
      { value: "medium", label: "15 to 25 hours (Balanced)" },
      { value: "full_time", label: "Over 25 hours (Intensive study)" },
    ],
  },
  {
    id: 4,
    text: "What is your ultimate career goal?",
    options: [
      { value: "first_job", label: "Landing my first job in tech as fast as possible" },
      { value: "high_salary", label: "Switching to a high-paying specialized domain" },
      { value: "freelance", label: "Working as a freelancer or starting an agency" },
      { value: "upgrade", label: "Upgrading inside my current company for promotion" },
    ],
  },
];

// Custom roadmaps mapping
const roadmaps = {
  development: {
    title: "Full Stack Developer Path",
    steps: [
      { title: "Frontend Foundations", desc: "Master HTML5, CSS3, ES6 JavaScript, and responsive design systems." },
      { title: "React Ecosystem", desc: "Build dynamic client interfaces with state management & Tailwind CSS." },
      { title: "Backend API Systems", desc: "Create robust servers using Node.js, Express, and REST APIs." },
      { title: "Databases & DevOps", desc: "Design database schemas (MongoDB/SQL) and host apps on cloud servers." },
      { title: "Capstone & Placement", desc: "Refactor portfolio projects, run mock interviews, and secure offers." },
    ],
    skills: ["HTML/CSS", "JavaScript", "React", "Node.js", "Express", "MongoDB", "REST APIs", "Git"],
    targetSlug: "full-stack-web-development",
  },
  data: {
    title: "Data Science & AI Practitioner Path",
    steps: [
      { title: "Math & SQL Basics", desc: "Learn stats, relational databases, data extraction, and relational modeling." },
      { title: "Python Programming", desc: "Write clean data analysis pipelines with Pandas, NumPy, and Jupyter." },
      { title: "Business Dashboards", desc: "Build visual metrics and insights using Power BI or Tableau." },
      { title: "Applied Machine Learning", desc: "Train classification models and build predictive workflows." },
      { title: "GenAI & Analytics Portfolio", desc: "Integrate LLM API workflows and draft executive reports." },
    ],
    skills: ["Python", "SQL", "Power BI", "Pandas", "Machine Learning", "Data Visualization", "GenAI"],
    targetSlug: "data-science-ai-ml",
  },
  design: {
    title: "UI/UX Design Specialist Path",
    steps: [
      { title: "UX Research Basics", desc: "Conduct user interviews, map personas, and analyze competitor flaws." },
      { title: "Visual Hierarchy", desc: "Master alignment, custom grids, premium typography, and colors." },
      { title: "Figma Design Systems", desc: "Build complex components, responsive grids, and autolayouts." },
      { title: "Interactive Prototypes", desc: "Create high-fidelity flows, transition micro-animations, and conduct tests." },
      { title: "Case Studies & Critique", desc: "Design recruiter-ready slides, refine portfolios, and practice defense." },
    ],
    skills: ["UX Research", "Figma", "Design Systems", "Wireframing", "High-fidelity Prototyping", "Usability Testing"],
    targetSlug: "ui-ux-design-expert",
  },
  cloud_ops: {
    title: "Cloud Architect & DevOps Engineer Path",
    steps: [
      { title: "System Administration", desc: "Understand Linux operations, terminal commands, and networking layers." },
      { title: "AWS Core Services", desc: "Provision storage (S3), compute (EC2), and handle security identities (IAM)." },
      { title: "Containerization", desc: "Containerize web products using Docker and orchestrate instances." },
      { title: "CI/CD Pipelines", desc: "Build automated code-delivery pipelines via Github Actions or Jenkins." },
      { title: "Monitoring & Infrastructure", desc: "Automate code setups using Terraform and track metrics with Prometheus." },
    ],
    skills: ["AWS", "Linux", "Docker", "CI/CD Pipelines", "Terraform", "Nginx", "GitHub Actions"],
    targetSlug: "devops-engineering",
  },
  security: {
    title: "Cyber Security & SOC Analyst Path",
    steps: [
      { title: "Network Defense", desc: "Analyze TCP/IP layers, routing controls, and monitor system handshakes." },
      { title: "Vulnerability Scans", desc: "Learn to use Nmap, Wireshark, and identify common misconfigurations." },
      { title: "Ethical Hacking Basics", desc: "Identify web application vulnerabilities defined by OWASP Top 10." },
      { title: "SOC Alert Operations", desc: "Configure SIEM tools, analyze event logs, and classify threats." },
      { title: "Compliance & Incident Labs", desc: "Audit risk frameworks, document findings, and practice mock audits." },
    ],
    skills: ["Network Security", "Linux Security", "OWASP", "SIEM", "Nmap", "Wireshark", "Threat Modeling"],
    targetSlug: "cyber-security-expert",
  },
  business_marketing: {
    title: "Digital Growth & Marketing Lead Path",
    steps: [
      { title: "SEO Optimization", desc: "Analyze search patterns, perform on-page updates, and build domain authority." },
      { title: "Paid Advertising", desc: "Configure conversion funnels and launch campaigns on Google and Meta Ads." },
      { title: "Data Web Analytics", desc: "Analyze event flows, conversion tracking, and campaign ROI using GA4." },
      { title: "Marketing Automation", desc: "Configure email automation triggers, landing pages, and lead scoring." },
      { title: "Campaign Case Study", desc: "Analyze budget allocation and design a growth marketing portfolio." },
    ],
    skills: ["SEO", "Google Ads", "Meta Ads", "Google Analytics (GA4)", "Funnels", "Email Automation"],
    targetSlug: "digital-marketing-mastery",
  },
};

export default function GuidancePage() {
  usePageMeta("Guidance - AI Career Assessments & Roadmaps");
  const pageRef = useRef<HTMLElement>(null);
  usePremiumPageMotion({ rootRef: pageRef });

  // Tab State
  const [activeTab, setActiveTab] = useState<"assessment" | "ai_coach" | "roadmaps">("assessment");

  // Assessment State
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [assessmentResult, setAssessmentResult] = useState<keyof typeof roadmaps | null>(null);

  // AI Career Coach State
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I am your AI Career Coach. Tell me about your background, skills, and target job roles. I will construct a tailored plan for you.",
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Handle Assessment option select
  const handleOptionSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [questions[currentStep]!.id]: value }));
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Analyze responses
      const primaryInterest = answers[1] ?? value; // fall back to current selection if state hasn't updated yet
      // Map primaryInterest to roadmap key
      let matchedKey: keyof typeof roadmaps = "development";
      if (primaryInterest in roadmaps) {
        matchedKey = primaryInterest as keyof typeof roadmaps;
      }
      setAssessmentResult(matchedKey);
    }
  };

  const resetAssessment = () => {
    setCurrentStep(0);
    setAnswers({});
    setAssessmentResult(null);
  };

  // Handle AI advice request
  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMsg = prompt.trim();
    setPrompt("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userMsg }]);
    setAiLoading(true);

    setTimeout(() => {
      let advice = "";
      const textLower = userMsg.toLowerCase();

      if (textLower.includes("java")) {
        advice = `**Java Backend Developer Roadmap Recommended!**\n\nBased on your mention of Java, here is a structured 3-stage plan:\n\n1. **Core Java & OOP**: Deep-dive into Object Oriented concepts, Collections, Exception Handling, and JUnit testing.\n2. **Spring Boot Framework**: Learn dependency injection, JPA/Hibernate, SQL databases, and build RESTful API services.\n3. **Deployment & Portfolio**: Containerize APIs with Docker and showcase a capstone 'Student/Store Management System' to recruiters.\n\n*Recommended Course:* We suggest reviewing our **Java Development** track for full mentorship.`;
      } else if (textLower.includes("data") || textLower.includes("python") || textLower.includes("analyst")) {
        advice = `**Data Analytics & Python Career Track Recommended!**\n\nHere is how you can achieve your transition:\n\n1. **Data Querying**: Master SQL databases, joins, aggregations, and subqueries.\n2. **Visual BI Dashboards**: Learn to build executive dashboards with Power BI to represent KPI trends.\n3. **Python Automation**: Write scripts with Pandas and automate dataset cleaning.\n\n*Recommended Course:* **AI-Powered Data Analytics** or **Data Science & AI/ML** program.`;
      } else if (textLower.includes("design") || textLower.includes("ui") || textLower.includes("ux") || textLower.includes("figma")) {
        advice = `**Product & UI/UX Design Roadmap Recommended!**\n\nHere is your design learning path:\n\n1. **UX Foundations & Research**: Learn user flow mappings, competitor analysis, and target personas.\n2. **Figma Mastery**: Build layouts using Auto-Layouts, Figma design systems, and interactive variables.\n3. **Portfolio Presentation**: Build at least 2 complete mobile/web case studies explaining your design iterations.\n\n*Recommended Course:* **UI/UX Design Expert** program.`;
      } else if (textLower.includes("cloud") || textLower.includes("devops") || textLower.includes("aws")) {
        advice = `**Cloud & DevOps Engineer Roadmap Recommended!**\n\nLet's get you ready for cloud operations:\n\n1. **Linux & Networking**: Command line comfort, SSH access, security groups, and routing.\n2. **AWS Core Services**: EC2 hosting, S3 cloud storage, IAM user controls.\n3. **CI/CD Automation**: Implement deployment pipelines using GitHub Actions.\n\n*Recommended Course:* **Cloud Computing (AWS)** or **DevOps Engineering** track.`;
      } else if (textLower.includes("security") || textLower.includes("hacking") || textLower.includes("cyber")) {
        advice = `**Cyber Security Analyst Roadmap Recommended!**\n\nHere is your path to entry-level SOC roles:\n\n1. **Network Defenses**: Configure firewalls and monitor interfaces with Wireshark.\n2. **Vulnerability Assessment**: Scan networks using Nmap and triage findings.\n3. **Incident Log Analysis**: Practice searching logs and compiling incident triage notes.\n\n*Recommended Course:* **Cyber Security Expert** program.`;
      } else {
        advice = `**Personalized Tech Transformation Pathway!**\n\nThank you for sharing your goal. To achieve a career transition:\n\n1. **Core Technical Training**: Dedicate 15-20 hours a week to build foundations in Development or Business Analytics.\n2. **Real-world Projects**: Create practical, recruiters-facing portfolio work.\n3. **Mentorship & Drills**: Work with a senior guide on resume positioning and mock interview loops.\n\n*Next Step:* We recommend booking a **Free 1:1 Counselling Session** with our experts for custom alignment!`;
      }

      setChatHistory((prev) => [...prev, { sender: "ai", text: advice }]);
      setAiLoading(false);
    }, 1500);
  };

  return (
    <main ref={pageRef} className="page-shell">
      {/* Banner/Hero Section */}
      <section className="relative overflow-hidden bg-primary px-4 py-16 text-primary-foreground sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(17,71,255,0.22),transparent_32rem)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(25,217,255,0.12),transparent_28rem)]" />
        
        <div className="relative mx-auto max-w-7xl text-center">
          <p className="premium-reveal inline-flex items-center gap-2 rounded-full border border-secondary/50 bg-secondary/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-accent backdrop-blur-sm">
            <Compass className="size-4 animate-spin-slow text-accent" />
            Career Navigator
          </p>
          <h1 className="premium-reveal mt-6 text-4xl font-[900] tracking-tight text-primary-foreground sm:text-6xl">
            Find Your Career fit. <span className="bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">Accelerate Your Switch.</span>
          </h1>
          <p className="premium-reveal mx-auto mt-6 max-w-2xl text-base leading-8 text-primary-foreground/76">
            Not sure which domain fits your background? Use our assessment tool, explore standard industry roadmaps, or query our AI Career Coach.
          </p>

          {/* Navigation Tabs */}
          <div className="premium-reveal mt-12 flex justify-center">
            <nav className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md" aria-label="Guidance navigation">
              <button
                type="button"
                onClick={() => setActiveTab("assessment")}
                className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-black transition-all duration-200 ${
                  activeTab === "assessment" ? "bg-secondary text-primary-foreground shadow-lg" : "text-primary-foreground/60 hover:text-primary-foreground"
                }`}
              >
                <BrainCircuit className="size-4" />
                Career Assessment
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ai_coach")}
                className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-black transition-all duration-200 ${
                  activeTab === "ai_coach" ? "bg-secondary text-primary-foreground shadow-lg" : "text-primary-foreground/60 hover:text-primary-foreground"
                }`}
              >
                <Sparkles className="size-4" />
                AI Career Coach
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("roadmaps")}
                className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-black transition-all duration-200 ${
                  activeTab === "roadmaps" ? "bg-secondary text-primary-foreground shadow-lg" : "text-primary-foreground/60 hover:text-primary-foreground"
                }`}
              >
                <Map className="size-4" />
                Career Roadmaps
              </button>
            </nav>
          </div>
        </div>
      </section>

      {/* Main Tab Panels */}
      <section className="bg-muted px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* TAB 1: ASSESSMENT PANEL */}
          {activeTab === "assessment" && (
            <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
              <div className="premium-card-motion rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(10,42,136,0.06)] sm:p-8">
                {!assessmentResult ? (
                  <div>
                    <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                      <h2 className="text-xl font-black text-primary">Step {currentStep + 1} of {questions.length}</h2>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {Math.round(((currentStep + 1) / questions.length) * 100)}% Complete
                      </span>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-2xl font-black text-primary leading-tight">
                        {questions[currentStep]!.text}
                      </h3>
                    </div>

                    <div className="grid gap-4">
                      {questions[currentStep]!.options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleOptionSelect(option.value)}
                          className="flex items-center justify-between w-full rounded-xl border border-border bg-muted p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-secondary hover:bg-secondary/5 hover:shadow-[0_8px_20px_rgba(17,71,255,0.06)]"
                        >
                          <span className="text-base font-bold text-primary">{option.label}</span>
                          <ChevronRight className="size-5 text-secondary" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-center pb-6 border-b border-border mb-8">
                      <div className="mx-auto grid size-16 place-items-center rounded-full bg-green-100 text-green-600 mb-4">
                        <CheckCircle2 className="size-9" />
                      </div>
                      <h2 className="text-3xl font-black text-primary">Assessment Completed!</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Here is your matching track recommendation based on your answers.</p>
                    </div>

                    {/* Result Block */}
                    <div className="rounded-2xl border border-green-200 bg-green-50/50 p-6 mb-8">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">Recommended Track</p>
                      <h3 className="text-3xl font-[900] text-primary mt-2">{roadmaps[assessmentResult].title}</h3>
                      <p className="text-sm text-muted-foreground mt-3">
                        This roadmap outlines the exact phases and technical tools required to transition from your background.
                      </p>
                      
                      <div className="mt-6 flex flex-wrap gap-2">
                        {roadmaps[assessmentResult].skills.map((skill) => (
                          <span key={skill} className="rounded-md bg-card border border-green-200 px-3 py-1.5 text-xs font-black text-primary">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Timeline representation */}
                    <div className="mb-8">
                      <h4 className="text-lg font-black text-primary mb-6">Your Transformation Milestones</h4>
                      <div className="relative border-l-2 border-border pl-6 ml-3 space-y-8">
                        {roadmaps[assessmentResult].steps.map((step, idx) => (
                          <div key={idx} className="relative">
                            <span className="absolute -left-[35px] top-1 grid size-6 place-items-center rounded-full bg-secondary text-[10px] font-black text-primary-foreground">
                              {idx + 1}
                            </span>
                            <h5 className="font-black text-primary text-base">{step.title}</h5>
                            <p className="text-sm text-muted-foreground mt-1.5 leading-6">{step.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                      {(() => {
                        const targetCourse = courses.find((c) => c.slug === roadmaps[assessmentResult].targetSlug);
                        if (targetCourse) {
                          return (
                            <Link
                              to={courseDetailRoute(targetCourse.slug)}
                              className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-black text-primary-foreground hover:bg-primary transition"
                            >
                              Explore {targetCourse.title} <ArrowRight className="size-4" />
                            </Link>
                          );
                        }
                        return null;
                      })()}
                      <button
                        type="button"
                        onClick={resetAssessment}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-black text-primary hover:bg-muted"
                      >
                        <RefreshCw className="size-4" /> Restart Assessment
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Info */}
              <aside className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6 shadow-[0_16px_50px_rgba(10,42,136,0.05)]">
                  <h3 className="font-black text-primary text-lg">Why take the assessment?</h3>
                  <ul className="mt-4 space-y-3.5 text-sm text-muted-foreground">
                    <li className="flex gap-2.5 items-start leading-6">
                      <CheckCircle2 className="size-4 text-secondary shrink-0 mt-1" />
                      <span><strong>Background Matching</strong>: Maps non-IT experience directly into relevant programs.</span>
                    </li>
                    <li className="flex gap-2.5 items-start leading-6">
                      <CheckCircle2 className="size-4 text-secondary shrink-0 mt-1" />
                      <span><strong>Pacing Estimation</strong>: Estimates the ideal study hours needed to prepare for technical roles.</span>
                    </li>
                    <li className="flex gap-2.5 items-start leading-6">
                      <CheckCircle2 className="size-4 text-secondary shrink-0 mt-1" />
                      <span><strong>Direct Outcome</strong>: Suggests courses that offer capstone project feedback and recruitment referral gates.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-primary p-6 text-primary-foreground shadow-[0_18px_60px_rgba(10,42,136,0.12)]">
                  <h3 className="font-black text-accent text-lg">Need 1:1 Live Guidance?</h3>
                  <p className="mt-2.5 text-sm leading-6 text-primary-foreground/76">
                    Our human counselling team is ready to map out your plan live. Get a call regarding your concerns.
                  </p>
                  <Link
                    to={routes.freeCounselling}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent text-xs font-black text-primary transition hover:bg-card"
                  >
                    Book Free Callback
                  </Link>
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: AI CAREER COACH PANEL */}
          {activeTab === "ai_coach" && (
            <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
              <div className="premium-card-motion rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(10,42,136,0.06)] flex flex-col min-h-[580px]">
                <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
                  <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-secondary to-accent text-primary-foreground">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-primary">AI Guidance Terminal</h2>
                    <p className="text-xs font-semibold text-green-600 flex items-center gap-1.5">
                      <span className="inline-block size-2 rounded-full bg-green-500 animate-pulse" /> Online and Ready
                    </p>
                  </div>
                </div>

                {/* Chat window */}
                <div className="flex-1 overflow-y-auto space-y-4 max-h-[360px] pr-2 scrollbar-thin">
                  {chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 max-w-[85%] ${
                        msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                          msg.sender === "user" ? "bg-secondary text-primary-foreground" : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        {msg.sender === "user" ? "U" : <Bot className="size-4" />}
                      </div>
                      <div
                        className={`rounded-2xl p-4 text-sm leading-6 ${
                          msg.sender === "user"
                            ? "bg-secondary text-primary-foreground rounded-tr-none"
                            : "bg-muted border border-border text-foreground rounded-tl-none"
                        }`}
                      >
                        {/* Render simple markdown formats */}
                        {msg.text.split("\n\n").map((para, pIdx) => {
                          if (para.startsWith("**")) {
                            return <p key={pIdx} className="font-black text-primary mb-2">{para.replace(/\*\*/g, "")}</p>;
                          }
                          if (para.startsWith("*Recommended Course:*")) {
                            return (
                              <p key={pIdx} className="italic text-xs font-semibold mt-3 text-secondary">
                                {para}
                              </p>
                            );
                          }
                          return <p key={pIdx} className="mb-2 last:mb-0">{para}</p>;
                        })}
                      </div>
                    </div>
                  ))}

                  {aiLoading && (
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
                        <Bot className="size-4 animate-spin" />
                      </div>
                      <div className="rounded-2xl p-4 text-sm bg-muted border border-border text-muted-foreground rounded-tl-none flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin text-secondary" />
                        <span>Structuring your custom curriculum path...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Console Input */}
                <form onSubmit={handleAiSubmit} className="mt-6 border-t border-border pt-5 flex gap-3">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask e.g. 'I want to be a web developer with no code background'"
                    disabled={aiLoading}
                    className="flex-1 h-12 rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !prompt.trim()}
                    className="grid size-12 place-items-center rounded-xl bg-secondary text-primary-foreground hover:bg-primary transition disabled:opacity-50"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              </div>

              {/* Sidebar Advice Examples */}
              <aside className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6 shadow-[0_16px_50px_rgba(10,42,136,0.05)]">
                  <h3 className="font-black text-primary text-lg">Example Prompt Snippets</h3>
                  <p className="text-xs text-muted-foreground mt-1">Try querying the AI with these concepts to get specialized roadmap responses:</p>
                  <div className="mt-4 space-y-2">
                    {[
                      "I want to learn Java Spring Boot",
                      "Transition to UI/UX design with Figma",
                      "How do I become a Cloud & DevOps engineer?",
                      "Is Python data science good for freshers?",
                    ].map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => setPrompt(text)}
                        className="w-full text-left rounded-lg bg-muted hover:bg-secondary/10 border border-border p-3 text-xs font-semibold text-primary transition"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* TAB 3: CAREER ROADMAPS */}
          {activeTab === "roadmaps" && (
            <div>
              <div className="text-center mb-10 max-w-2xl mx-auto">
                <h2 className="text-3xl font-black text-primary">Explore Our Learning Blueprints</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Detailed timelines mapped out by our industry mentors representing the actual competencies demanded in recruiter interviews.
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-3">
                {Object.entries(roadmaps).map(([key, roadmap]) => (
                  <article
                    key={key}
                    className="premium-card-motion flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[0_16px_45px_rgba(10,42,136,0.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(17,71,255,0.08)]"
                  >
                    <div>
                      <span className="rounded-md bg-secondary/10 text-secondary px-2.5 py-1 text-xs font-black uppercase tracking-wider">
                        {key.replace("_", " ")}
                      </span>
                      <h3 className="text-xl font-[900] text-primary mt-4">{roadmap.title}</h3>
                      
                      <div className="mt-5 space-y-4">
                        {roadmap.steps.slice(0, 3).map((step, idx) => (
                          <div key={idx} className="flex gap-3">
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary text-[10px] font-black mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-black text-primary">{step.title}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-5 line-clamp-2">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground italic pt-1">+ {roadmap.steps.length - 3} more phases including Mock interview gating...</p>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-border pt-4 flex items-center justify-between">
                      {(() => {
                        const targetCourse = courses.find((c) => c.slug === roadmap.targetSlug);
                        return targetCourse ? (
                          <>
                            <span className="text-xs font-bold text-muted-foreground">{targetCourse.duration} Program</span>
                            <Link
                              to={courseDetailRoute(targetCourse.slug)}
                              className="inline-flex items-center gap-1.5 text-xs font-black text-secondary hover:gap-2.5 transition-all"
                            >
                              Explore Course <ArrowRight className="size-3.5" />
                            </Link>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recommended Courses Banner */}
      <section className="bg-card px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">Program Recommendations</p>
              <h2 className="mt-4 text-3xl font-[900] text-primary sm:text-5xl">Top Aligned Career Tracks</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Every track includes live mentor labs, localized case studies, and corporate placement support to ensure career outcomes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 3).map((course) => (
              <article key={course.slug} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <img src={course.image} alt={course.title} className="rounded-lg aspect-video w-full object-cover object-center bg-muted" />
                  <span className="inline-block mt-4 rounded-md bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-black">{course.badge}</span>
                  <h3 className="text-lg font-black text-primary mt-2.5 leading-snug">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{course.summary}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-lg font-black text-secondary">₹{course.price.toLocaleString("en-IN")}</span>
                  <Link to={courseDetailRoute(course.slug)} className="inline-flex h-9 items-center justify-center rounded-lg bg-secondary/10 px-4 text-xs font-black text-secondary hover:bg-secondary hover:text-primary-foreground transition">
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
