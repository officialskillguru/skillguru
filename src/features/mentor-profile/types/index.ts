export interface MentorStatistic {
  label: string;
  value: string | number;
  icon?: string; // name of lucide icon
}

export interface MentorExperience {
  id: string;
  company: string;
  companyLogo: string;
  role: string;
  startDate: string; // e.g. '2022-01-01' or 'Jan 2022'
  endDate?: string; // null means 'Present'
  duration: string; // e.g. '2 Years 5 Months'
  responsibilities: string[];
  achievements: string[];
}

export interface MentorCertification {
  id: string;
  name: string;
  issuer: string;
  issuerLogo: string;
  issueDate: string;
  credentialUrl?: string;
}

export interface MentorSkill {
  id: string;
  name: string;
}

export interface MentorCourse {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  duration: string;
  studentsEnrolled: number;
  rating: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  hasCertificate: boolean;
  projectsCount: number;
}

export interface MentorProject {
  id: string;
  title: string;
  description: string;
  image: string;
  techStack: string[];
  industry: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  githubUrl?: string;
  liveUrl?: string;
}

export interface MentorAchievement {
  id: string;
  title: string;
  description: string;
  date: string;
  icon?: string;
}

export interface MentorReview {
  id: string;
  studentName: string;
  studentAvatar: string;
  courseName: string;
  rating: number; // 1-5
  date: string;
  content: string;
  isVerified: boolean;
  mentorReply?: string;
}

export interface MentorFAQ {
  id: string;
  question: string;
  answer: string;
}

export interface MentorAvailability {
  timezone: string;
  availableDays: string[]; // e.g. ['Monday', 'Wednesday']
  sessionDurationMinutes: number;
  status: "Available" | "Limited Slots" | "Unavailable";
}

export interface Mentor {
  id: string;
  slug: string;
  name: string;
  avatar: string;
  verified: boolean;
  role: string;
  company: string;
  companyLogo: string;
  location: string;
  about: string; // Full biography
  teachingPhilosophy?: string;
  languages: string[];
  expertise: string[]; // e.g. ['Python', 'Machine Learning']
  tools: string[]; // e.g. ['AWS', 'Docker']
  companiesWorkedWith: { name: string; logo: string }[];
  mentorshipProcess: { step: number; title: string; description: string }[];
  socialLinks: {
    email?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    twitter?: string;
  };

  // Relations mapped by the repository from real Supabase tables
  stats: MentorStatistic[];
  experience: MentorExperience[];
  certifications: MentorCertification[];
  skills: MentorSkill[];
  coursesTaught: MentorCourse[];
  projects: MentorProject[];
  achievements: MentorAchievement[];
  reviews: MentorReview[];
  faqs: MentorFAQ[];
  availability: MentorAvailability;
}
