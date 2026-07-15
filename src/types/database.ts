import type { Database as GenDatabase } from "./database.types";

export type Database = GenDatabase;

export type AppRole = "admin" | "counsellor" | "sales" | "content_manager";
export type AccountStatus = "active" | "inactive" | "suspended" | "pending";
export type ContentStatus = "draft" | "published" | "archived";
export type CrmLeadStatus = "new" | "contacted" | "qualified" | "converted" | "closed";

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Inserts<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type Updates<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
