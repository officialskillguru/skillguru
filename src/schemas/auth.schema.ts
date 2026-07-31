import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Public self-signup is student-only — mentor accounts are provisioned
// exclusively by an admin via the Admin Dashboard (create-mentor Edge
// Function). The DB's own handle_new_user() trigger also always assigns the
// "student" role regardless of this field, so this is belt-and-suspenders,
// not the only enforcement point.
export const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.literal("student").default("student"),
});

export type SignupFormData = z.infer<typeof signupSchema>;
