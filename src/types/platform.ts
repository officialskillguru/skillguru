import type { LucideIcon } from "lucide-react";

export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";
export type LearningMode = "Online" | "Offline" | "Hybrid";

export type DetailPair = {
  label: string;
  value: string;
};

export type CourseProject = {
  title: string;
  description: string;
};

export type CourseModule = {
  title: string;
  description: string;
  lessons: string[];
};

export type Course = {
  slug: string;
  title: string;
  category: string;
  track: string;
  summary: string;
  description: string;
  duration: string;
  mentor: string;
  mentorRole: string;
  mentorAvatar: string;
  image: string;
  badge: string;
  level: CourseLevel;
  mode: LearningMode;
  price: number;
  oldPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  lessons: string;
  projects: string;
  assignments: string;
  skills: string[];
  tools: string[];
  placementSupport: string;
  outcomes: string[];
  curriculum: CourseModule[];
  projectsBuilt: CourseProject[];
  includes: DetailPair[];
};

export type Mentor = {
  slug: string;
  name: string;
  role: string;
  company: string;
  companyLogo: string;
  avatar: string;
  category: string;
  experience: string;
  experienceYears: number;
  studentsMentored: number;
  rating: number;
  location: string;
  language: string;
  availability: string;
  bio: string;
  expertise: string[];
  workedWith: string[];
};

export type Testimonial = {
  name: string;
  role: string;
  company: string;
  companyLogo: string;
  avatar: string;
  quote: string;
  growth: string;
};

export type SuccessStory = Testimonial & {
  before: string;
  after: string;
  package: string;
  course: string;
  duration: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
  date: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type OfficeLocation = {
  city: string;
  label: string;
  address: string;
  phone: string;
  email: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
};
