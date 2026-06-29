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

export interface MentorEducation {
  id: string;
  institution: string;
  degree: string;
  branch: string;
  graduationYear: number;
  cgpa?: string;
  coursework?: string[];
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
  proficiency: number; // 0-100
  category: "Technical" | "Soft" | "Tool";
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
  companyJoined?: string;
  salaryBefore?: string;
  salaryAfter?: string;
  isVerified: boolean;
}

export interface MentorTestimonial {
  id: string;
  studentName: string;
  studentAvatar: string;
  studentRole: string;
  quote: string;
  companyLogo: string;
  companyName: string;
  previousRole?: string;
  currentRole?: string;
  previousSalary?: string;
  currentSalary?: string;
  mentorshipDuration: string;
  courseName?: string;
}

export interface MentorFAQ {
  id: string;
  question: string;
  answer: string;
}

export interface MentorAvailabilitySlot {
  id: string;
  startTime: string; // ISO format or time string
  endTime: string;
  isAvailable: boolean;
}

export interface MentorAvailability {
  timezone: string;
  availableDays: string[]; // e.g. ['Monday', 'Wednesday']
  nextAvailableDate?: string;
  slots: Record<string, MentorAvailabilitySlot[]>; // Map of date (YYYY-MM-DD) to slots
  sessionDurationMinutes: number;
  status: "Available" | "Limited Slots" | "Busy" | "Unavailable";
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
  videoIntroductionUrl?: string;
  resumeUrl?: string;
  
  // Relations mapped by the service/API layer
  stats: MentorStatistic[];
  experience: MentorExperience[];
  education: MentorEducation[];
  certifications: MentorCertification[];
  skills: MentorSkill[];
  coursesTaught: MentorCourse[];
  projects: MentorProject[];
  achievements: MentorAchievement[];
  reviews: MentorReview[];
  testimonials: MentorTestimonial[]; // Student outcomes specific to this mentor
  faqs: MentorFAQ[];
  availability: MentorAvailability;
}
