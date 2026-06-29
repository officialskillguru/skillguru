export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string;
          source: string;
          status: "new" | "contacted" | "qualified" | "converted" | "closed";
          crm_status: string | null;
          assigned_to: string | null;
          course_slug: string | null;
          name: string | null;
          course_interest: string | null;
          message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          phone: string;
          source: string;
          status?: "new" | "contacted" | "qualified" | "converted" | "closed";
          crm_status?: string | null;
          assigned_to?: string | null;
          course_slug?: string | null;
          name?: string | null;
          course_interest?: string | null;
          message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };
      enquiries: {
        Row: {
          id: string;
          lead_id: string | null;
          course_slug: string;
          preferred_mode: "online" | "classroom" | "hybrid" | null;
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          course_slug: string;
          preferred_mode?: "online" | "classroom" | "hybrid" | null;
          message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["enquiries"]["Insert"]>;
        Relationships: [];
      };
      counselling_bookings: {
        Row: {
          id: string;
          lead_id: string | null;
          career_stage: string;
          current_role: string | null;
          goals: string;
          preferred_date: string;
          preferred_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          career_stage: string;
          current_role?: string | null;
          goals: string;
          preferred_date: string;
          preferred_time: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["counselling_bookings"]["Insert"]>;
        Relationships: [];
      };
      demo_bookings: {
        Row: {
          id: string;
          lead_id: string | null;
          course_slug: string;
          preferred_date: string;
          preferred_time: string;
          learning_mode: "online" | "classroom" | "hybrid";
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          course_slug: string;
          preferred_date: string;
          preferred_time: string;
          learning_mode: "online" | "classroom" | "hybrid";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["demo_bookings"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      lead_notes: { Row: { id: string; lead_id: string; note: string; author_id?: string | null; created_at: string; }; Insert: Partial<{ id: string; lead_id: string; note: string; author_id?: string | null; created_at: string; }>; Update: Partial<{ id: string; lead_id: string; note: string; author_id?: string | null; created_at: string; }>; Relationships: []; };
      lead_timeline: { Row: { id: string; lead_id: string; title?: string; description?: string; type?: string; action?: string; from_status?: string | null; to_status?: string; actor_id?: string | null; created_at: string; }; Insert: Partial<{ id: string; lead_id: string; title?: string; description?: string; type?: string; action?: string; from_status?: string | null; to_status?: string; actor_id?: string | null; created_at: string; }>; Update: Partial<{ id: string; lead_id: string; title?: string; description?: string; type?: string; action?: string; from_status?: string | null; to_status?: string; actor_id?: string | null; created_at: string; }>; Relationships: []; };
      activity_logs: { Row: { id: string; user_id: string; action: string; metadata?: unknown; created_at: string; }; Insert: Partial<{ id: string; user_id: string; action: string; metadata?: unknown; created_at: string; }>; Update: Partial<{ id: string; user_id: string; action: string; metadata?: unknown; created_at: string; }>; Relationships: []; };
      admin_accounts: { Row: { id: string; user_id: string; full_name: string; email: string; role: "admin" | "counsellor" | "sales" | "content_manager"; status?: string; created_at: string; }; Insert: Partial<{ id: string; user_id: string; full_name: string; email: string; role: "admin" | "counsellor" | "sales" | "content_manager"; status?: string; created_at: string; }>; Update: Partial<{ id: string; user_id: string; full_name: string; email: string; role: "admin" | "counsellor" | "sales" | "content_manager"; status?: string; created_at: string; }>; Relationships: []; };
      users: { Row: { id: string; email: string; user_id: string; role?: string; filter?: unknown; created_at: string; }; Insert: Partial<{ id: string; email: string; user_id: string; role?: string; filter?: unknown; created_at: string; }>; Update: Partial<{ id: string; email: string; user_id: string; role?: string; filter?: unknown; created_at: string; }>; Relationships: []; };
      courses: { Row: { id: string; title: string; slug: string; status: string; is_featured: boolean; is_published: boolean; category_id?: string; created_at: string; }; Insert: Partial<{ id: string; title: string; slug: string; status: string; is_featured: boolean; is_published: boolean; category_id?: string; created_at: string; }>; Update: Partial<{ id: string; title: string; slug: string; status: string; is_featured: boolean; is_published: boolean; category_id?: string; created_at: string; }>; Relationships: []; };
      mentors: { Row: { id: string; slug: string; name: string; title: string; company: string; bio: string; avatarUrl: string; hourlyRate: number; status: string; featured?: boolean; created_at: string; data?: unknown; }; Insert: Partial<{ id: string; slug: string; name: string; title: string; company: string; bio: string; avatarUrl: string; hourlyRate: number; status: string; featured?: boolean; created_at: string; data?: unknown; }>; Update: Partial<{ id: string; slug: string; name: string; title: string; company: string; bio: string; avatarUrl: string; hourlyRate: number; status: string; featured?: boolean; created_at: string; data?: unknown; }>; Relationships: []; };
      mentor_education: { Row: { id: string; mentor_id: string; degree: string; institution: string; start_year: string; end_year: string; }; Insert: Partial<{ id: string; mentor_id: string; degree: string; institution: string; start_year: string; end_year: string; }>; Update: Partial<{ id: string; mentor_id: string; degree: string; institution: string; start_year: string; end_year: string; }>; Relationships: []; };
      mentor_certifications: { Row: { id: string; mentor_id: string; name: string; issuer: string; year: string; }; Insert: Partial<{ id: string; mentor_id: string; name: string; issuer: string; year: string; }>; Update: Partial<{ id: string; mentor_id: string; name: string; issuer: string; year: string; }>; Relationships: []; };
      mentor_experience: { Row: { id: string; mentor_id: string; role: string; company: string; start_date: string; end_date?: string; duration: string; responsibilities: string[]; achievements?: string[]; company_logo?: string; }; Insert: Partial<{ id: string; mentor_id: string; role: string; company: string; start_date: string; end_date?: string; duration: string; responsibilities: string[]; achievements?: string[]; company_logo?: string; }>; Update: Partial<{ id: string; mentor_id: string; role: string; company: string; start_date: string; end_date?: string; duration: string; responsibilities: string[]; achievements?: string[]; company_logo?: string; }>; Relationships: []; };
      mentor_reviews: { Row: { id: string; mentor_id: string; student_name: string; student_avatar: string; is_verified: boolean; course_name: string; rating: number; content: string; date: string; }; Insert: Partial<{ id: string; mentor_id: string; student_name: string; student_avatar: string; is_verified: boolean; course_name: string; rating: number; content: string; date: string; }>; Update: Partial<{ id: string; mentor_id: string; student_name: string; student_avatar: string; is_verified: boolean; course_name: string; rating: number; content: string; date: string; }>; Relationships: []; };
      students: { Row: { id: string; mentor_id?: string | null; course_id?: string | null; name: string; email: string; phone?: string; city?: string; state?: string; status: string; enrollment_date?: string; created_at: string; }; Insert: Partial<{ id: string; mentor_id?: string | null; course_id?: string | null; name: string; email: string; phone?: string; city?: string; state?: string; status: string; enrollment_date?: string; created_at: string; }>; Update: Partial<{ id: string; mentor_id?: string | null; course_id?: string | null; name: string; email: string; phone?: string; city?: string; state?: string; status: string; enrollment_date?: string; created_at: string; }>; Relationships: []; };
      success_stories: { Row: { id: string; title: string; full_name?: string | null; story?: string | null; company_name?: string | null; slug: string; status: string; is_published?: boolean; featured: boolean; created_at: string; }; Insert: Partial<{ id: string; title: string; full_name?: string | null; story?: string | null; company_name?: string | null; slug: string; status: string; is_published?: boolean; featured: boolean; created_at: string; }>; Update: Partial<{ id: string; title: string; full_name?: string | null; story?: string | null; company_name?: string | null; slug: string; status: string; is_published?: boolean; featured: boolean; created_at: string; }>; Relationships: []; };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_roles: { Args: Record<string, never>; Returns: string[] };
    };
    Enums: {
      app_role: "admin" | "counsellor" | "sales" | "content_manager";
      lead_status: "new" | "contacted" | "qualified" | "converted" | "closed";
      learning_mode: "online" | "classroom" | "hybrid";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type AppRole = "admin" | "counsellor" | "sales" | "content_manager";
export type AccountStatus = "active" | "inactive" | "suspended" | "pending";
export type ContentStatus = "draft" | "published" | "archived";
export type CrmLeadStatus = "new" | "contacted" | "qualified" | "converted" | "closed";

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<T extends string> = T extends keyof PublicSchema["Tables"] ? PublicSchema["Tables"][T]["Row"] : Record<string, unknown>;
export type Inserts<T extends string> = T extends keyof PublicSchema["Tables"] ? PublicSchema["Tables"][T]["Insert"] : Record<string, unknown>;
export type Updates<T extends string> = T extends keyof PublicSchema["Tables"] ? PublicSchema["Tables"][T]["Update"] : Record<string, unknown>;
export type Enums<T extends string> = T extends keyof PublicSchema["Enums"] ? PublicSchema["Enums"][T] : string;
