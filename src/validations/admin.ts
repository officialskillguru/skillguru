import { z } from "zod";

import { slugify } from "@/lib/slug";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[0-9\s-]{7,16}$/, "Enter a valid phone number.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const contentStatusSchema = z.enum(["draft", "published", "archived"]);
export const accountStatusSchema = z.enum(["active", "inactive", "disabled"]);
export const crmLeadStatusSchema = z.enum(["new", "contacted", "qualified", "follow_up", "converted", "lost"]);
export const appRoleSchema = z.enum([
  "super_admin",
  "admin",
  "editor",
  "mentor_manager",
  "course_manager",
  "crm_manager",
  "counsellor",
  "sales",
  "content_manager",
]);

export const courseSchema = z.object({
  title: z.string().trim().min(2),
  slug: z.string().trim().optional().transform((value) => (value ? slugify(value) : undefined)),
  description: z.string().trim().min(20),
  summary: z.string().trim().min(10),
  short_description: z.string().trim().optional(),
  category_id: z.string().uuid().nullable().optional(),
  mentor_id: z.string().uuid().nullable().optional(),
  price_inr: z.coerce.number().int().nonnegative().nullable().optional(),
  discount_price: z.coerce.number().int().nonnegative().nullable().optional(),
  duration: z.string().trim().optional(),
  level: z.string().trim().optional(),
  thumbnail: z.string().trim().optional(),
  banner: z.string().trim().optional(),
  status: contentStatusSchema.default("draft"),
  featured: z.boolean().default(false),
  certificate_available: z.boolean().default(false),
});

export const mentorSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().nullable().optional(),
  phone: phoneSchema.nullable().optional(),
  designation: z.string().trim().min(2),
  bio: z.string().trim().min(20),
  experience_years: z.coerce.number().int().nonnegative().default(0),
  linkedin_url: z.string().trim().url().nullable().optional(),
  profile_image: z.string().trim().nullable().optional(),
  skills: z.array(z.string().trim().min(1)).default([]),
  status: accountStatusSchema.default("active"),
  featured: z.boolean().default(false),
});

export const studentSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: phoneSchema.nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  course_id: z.string().uuid().nullable().optional(),
  mentor_id: z.string().uuid().nullable().optional(),
  enrollment_date: z.string().trim().nullable().optional(),
  status: accountStatusSchema.default("active"),
  profile_image: z.string().trim().nullable().optional(),
});

export const leadSchema = z.object({
  full_name: z.string().trim().min(2),
  name: z.string().trim().nullable().optional(),
  email: z.string().trim().email(),
  phone: phoneSchema,
  source: z.string().trim().min(1),
  crm_status: crmLeadStatusSchema.default("new"),
  course_interest: z.string().trim().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  message: z.string().trim().nullable().optional(),
});

export const adminAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  role: appRoleSchema.default("admin"),
  status: accountStatusSchema.default("active"),
  profile_image: z.string().trim().nullable().optional(),
});

export const successStorySchema = z.object({
  student_name: z.string().trim().min(2),
  course_name: z.string().trim().nullable().optional(),
  company_name: z.string().trim().nullable().optional(),
  package: z.string().trim().nullable().optional(),
  testimonial: z.string().trim().min(20),
  image: z.string().trim().nullable().optional(),
  video_url: z.string().trim().url().nullable().optional(),
  featured: z.boolean().default(false),
  status: contentStatusSchema.default("draft"),
});

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  remember: z.boolean().default(true),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords must match.",
  path: ["confirmPassword"],
});

export type CourseFormValues = z.infer<typeof courseSchema>;
export type MentorFormValues = z.infer<typeof mentorSchema>;
export type StudentFormValues = z.infer<typeof studentSchema>;
export type LeadFormValues = z.infer<typeof leadSchema>;
export type AdminAccountFormValues = z.infer<typeof adminAccountSchema>;
export type SuccessStoryFormValues = z.infer<typeof successStorySchema>;
