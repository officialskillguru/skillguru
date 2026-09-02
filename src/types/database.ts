import type { Database as GenDatabase, Json as GenJson } from "./database.types";

export type Database = GenDatabase;
export type Json = GenJson;

// Re-exported from the domain model so there's a single source of truth for
// the app's role union - this file previously declared its own (stale,
// missing "student"/"mentor") copy.
export type { AppRole } from "@/domain/auth/models/Profile";
export type AccountStatus = "active" | "inactive" | "suspended" | "pending";
export type CrmLeadStatus = "new" | "contacted" | "qualified" | "converted" | "closed";

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Inserts<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type Updates<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
/** courses.status — kept as a named alias since call sites predate the generated Enums<> helper. */
export type ContentStatus = Enums<"course_status">;
