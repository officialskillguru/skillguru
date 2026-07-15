import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "VITE_SUPABASE_ANON_KEY is required"),
  // Only validated on the server or node scripts; client shouldn't care if it's missing on the browser.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  VITE_ENABLE_AUDIT_LOGS: z.enum(["true", "false"]).optional().transform((val) => val === "true"),
});

export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined,
  VITE_ENABLE_AUDIT_LOGS: import.meta.env.VITE_ENABLE_AUDIT_LOGS as string | undefined,
});
