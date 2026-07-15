import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import type { Database } from "@/types/database.types";
import { logger } from "@/config/logger";

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  logger.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Admin client will fail.");
}

// NOTE: This should NEVER be used in client-side React code.
export const supabaseAdmin = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
