export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          channel: string
          created_at: string
          drop_off_stage: string | null
          duration_seconds: number | null
          ended_at: string | null
          escalated_at: string | null
          escalated_to: string | null
          id: string
          intent: string | null
          lead_id: string | null
          metadata: Json
          profile_id: string | null
          started_at: string
          status: string
          summary: string | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          drop_off_stage?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          intent?: string | null
          lead_id?: string | null
          metadata?: Json
          profile_id?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          drop_off_stage?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          intent?: string | null
          lead_id?: string | null
          metadata?: Json
          profile_id?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_customer_memory: {
        Row: {
          created_at: string
          id: string
          interaction_summary: string | null
          last_conversation_id: string | null
          last_interaction_at: string | null
          preferences: Json
          preferred_courses: string[]
          profile_id: string
          total_conversations: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_summary?: string | null
          last_conversation_id?: string | null
          last_interaction_at?: string | null
          preferences?: Json
          preferred_courses?: string[]
          profile_id: string
          total_conversations?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_summary?: string | null
          last_conversation_id?: string | null
          last_interaction_at?: string | null
          preferences?: Json
          preferred_courses?: string[]
          profile_id?: string
          total_conversations?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_customer_memory_last_conversation_id_fkey"
            columns: ["last_conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_customer_memory_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "agent_knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_knowledge_documents: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          source_id: string | null
          source_table: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          source_id?: string | null
          source_table?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          source_id?: string | null
          source_table?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_knowledge_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          event_type: string
          id: string
          level: string
          payload: Json
          request_id: string | null
          source: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          level?: string
          payload?: Json
          request_id?: string | null
          source: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          level?: string
          payload?: Json
          request_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          audio_file_id: string | null
          citations: Json
          content: string
          conversation_id: string
          created_at: string
          function_call: Json | null
          id: string
          intent: string | null
          latency_ms: number | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          audio_file_id?: string | null
          citations?: Json
          content: string
          conversation_id: string
          created_at?: string
          function_call?: Json | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          audio_file_id?: string | null
          citations?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          function_call?: Json | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_audio_file_id_fkey"
            columns: ["audio_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          created_at: string
          deleted_at: string | null
          document_type: string
          file_id: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          deleted_at?: string | null
          document_type?: string
          file_id: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          deleted_at?: string | null
          document_type?: string
          file_id?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "placement_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attempt_number: number
          content: string | null
          created_at: string
          feedback: string | null
          file_urls: string[] | null
          graded_at: string | null
          graded_by: string | null
          id: string
          rubric_scores: Json | null
          score: number | null
          status: string
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          attempt_number?: number
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_urls?: string[] | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          rubric_scores?: Json | null
          score?: number | null
          status?: string
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          attempt_number?: number
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_urls?: string[] | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          rubric_scores?: Json | null
          score?: number | null
          status?: string
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_resubmit: boolean
          attachment_ids: string[] | null
          course_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          max_attempts: number | null
          max_score: number | null
          mentor_id: string
          passing_score: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_resubmit?: boolean
          attachment_ids?: string[] | null
          course_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_attempts?: number | null
          max_score?: number | null
          mentor_id: string
          passing_score?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_resubmit?: boolean
          attachment_ids?: string[] | null
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_attempts?: number | null
          max_score?: number | null
          mentor_id?: string
          passing_score?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          course_id: string | null
          created_at: string
          date: string
          id: string
          marked_by: string | null
          notes: string | null
          session_id: string | null
          session_type: string
          status: string
          student_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          session_id?: string | null
          session_type?: string
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          session_id?: string | null
          session_type?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          request_id: string | null
          target_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          request_id?: string | null
          target_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          request_id?: string | null
          target_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number
          deleted_at: string | null
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          timezone: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week: number
          deleted_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          deleted_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          calendar_id: string
          color: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          ends_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          is_active: boolean
          is_all_day: boolean
          is_recurring: boolean
          location: string | null
          meeting_url: string | null
          recurrence_rule: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calendar_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          is_all_day?: boolean
          is_recurring?: boolean
          location?: string | null
          meeting_url?: string | null
          recurrence_rule?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calendar_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          is_all_day?: boolean
          is_recurring?: boolean
          location?: string | null
          meeting_url?: string | null
          recurrence_rule?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          timezone: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          id: string
          opened_at: string | null
          recipient_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          id?: string
          opened_at?: string | null
          recipient_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          id?: string
          opened_at?: string | null
          recipient_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_type: string
          body: string
          course_id: string | null
          created_at: string
          id: string
          name: string
          scheduled_at: string | null
          sender_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          target_role: string | null
          total_recipients: number | null
          type: string
          updated_at: string
        }
        Insert: {
          audience_type?: string
          body: string
          course_id?: string | null
          created_at?: string
          id?: string
          name: string
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          target_role?: string | null
          total_recipients?: number | null
          type?: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          target_role?: string | null
          total_recipients?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_guidance_reports: {
        Row: {
          action_items: string[]
          completion_tokens: number
          created_at: string
          id: string
          model_name: string
          prompt_tokens: number
          recommended_course_ids: string[]
          skill_gaps: Json
          student_id: string
          summary: string
          target_role: string
        }
        Insert: {
          action_items?: string[]
          completion_tokens?: number
          created_at?: string
          id?: string
          model_name: string
          prompt_tokens?: number
          recommended_course_ids?: string[]
          skill_gaps?: Json
          student_id: string
          summary: string
          target_role: string
        }
        Update: {
          action_items?: string[]
          completion_tokens?: number
          created_at?: string
          id?: string
          model_name?: string
          prompt_tokens?: number
          recommended_course_ids?: string[]
          skill_gaps?: Json
          student_id?: string
          summary?: string
          target_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_guidance_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          created_at: string
          created_by: string | null
          css_styles: string | null
          description: string | null
          html_template: string
          id: string
          is_default: boolean
          name: string
          preview_url: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          css_styles?: string | null
          description?: string | null
          html_template: string
          id?: string
          is_default?: boolean
          name: string
          preview_url?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          css_styles?: string | null
          description?: string | null
          html_template?: string
          id?: string
          is_default?: boolean
          name?: string
          preview_url?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_file_id: string | null
          certificate_number: string
          created_at: string
          enrollment_id: string
          id: string
          issued_at: string
          issued_by: string | null
          metadata: Json | null
          qr_code_url: string | null
          share_url: string | null
          template_id: string | null
          updated_at: string
          verification_code: string
        }
        Insert: {
          certificate_file_id?: string | null
          certificate_number: string
          created_at?: string
          enrollment_id: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          metadata?: Json | null
          qr_code_url?: string | null
          share_url?: string | null
          template_id?: string | null
          updated_at?: string
          verification_code: string
        }
        Update: {
          certificate_file_id?: string | null
          certificate_number?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          metadata?: Json | null
          qr_code_url?: string | null
          share_url?: string | null
          template_id?: string | null
          updated_at?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "cert_enrollment_fk"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cert_file_fk"
            columns: ["certificate_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          is_edited: boolean
          message_type: string
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          metadata: Json | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          metadata?: Json | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          metadata?: Json | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          applicable_course_id: string | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_pct: number
          discount_type: string
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_uses: number | null
          min_order_amount: number | null
          times_used: number | null
          valid_until: string | null
        }
        Insert: {
          applicable_course_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_pct: number
          discount_type?: string
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          times_used?: number | null
          valid_until?: string | null
        }
        Update: {
          applicable_course_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_pct?: number
          discount_type?: string
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          times_used?: number | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_codes_applicable_course_id_fkey"
            columns: ["applicable_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          category_id: string
          course_id: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          category_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          category_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_faqs: {
        Row: {
          answer: string
          course_id: string
          created_at: string
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          course_id: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          course_id?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_faqs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_media: {
        Row: {
          caption: string | null
          course_id: string
          created_at: string
          created_by: string | null
          file_id: string
          id: string
          media_type: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          file_id: string
          id?: string
          media_type: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          file_id?: string
          id?: string
          media_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_media_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_media_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mentors: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          course_id: string
          created_at: string
          id: string
          is_primary: boolean
          mentor_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          course_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          mentor_id: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          course_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          mentor_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_mentors_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mentors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mentors_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_lessons: number
          completion_percentage: number
          created_at: string
          enrollment_id: string
          id: string
          last_activity_at: string | null
          total_lessons: number
          updated_at: string
        }
        Insert: {
          completed_lessons?: number
          completion_percentage?: number
          created_at?: string
          enrollment_id: string
          id?: string
          last_activity_at?: string | null
          total_lessons?: number
          updated_at?: string
        }
        Update: {
          completed_lessons?: number
          completion_percentage?: number
          created_at?: string
          enrollment_id?: string
          id?: string
          last_activity_at?: string | null
          total_lessons?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_enrollment_fk"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_tags: {
        Row: {
          course_id: string
          tag_id: string
        }
        Insert: {
          course_id: string
          tag_id: string
        }
        Update: {
          course_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tags_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          banner_file_id: string | null
          course_type: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          discount_price: number | null
          duration: string | null
          id: string
          language: string
          level: Database["public"]["Enums"]["course_level"]
          mentor_id: string
          organization_id: string | null
          price: number | null
          promo_video_file_id: string | null
          requirements: string[]
          search_vector: unknown
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_file_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          what_you_will_learn: string[]
        }
        Insert: {
          banner_file_id?: string | null
          course_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discount_price?: number | null
          duration?: string | null
          id?: string
          language?: string
          level?: Database["public"]["Enums"]["course_level"]
          mentor_id: string
          organization_id?: string | null
          price?: number | null
          promo_video_file_id?: string | null
          requirements?: string[]
          search_vector?: unknown
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_file_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          what_you_will_learn?: string[]
        }
        Update: {
          banner_file_id?: string | null
          course_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discount_price?: number | null
          duration?: string | null
          id?: string
          language?: string
          level?: Database["public"]["Enums"]["course_level"]
          mentor_id?: string
          organization_id?: string | null
          price?: number | null
          promo_video_file_id?: string | null
          requirements?: string[]
          search_vector?: unknown
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_file_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          what_you_will_learn?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "courses_banner_file_id_fkey"
            columns: ["banner_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_promo_video_file_id_fkey"
            columns: ["promo_video_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_thumbnail_file_id_fkey"
            columns: ["thumbnail_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          enrolled_at: string
          enrollment_source: Database["public"]["Enums"]["enrollment_source"]
          granted_by: string | null
          id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          enrolled_at?: string
          enrollment_source?: Database["public"]["Enums"]["enrollment_source"]
          granted_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          enrolled_at?: string
          enrollment_source?: Database["public"]["Enums"]["enrollment_source"]
          granted_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enr_course_fk"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enr_granted_fk"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enr_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          checksum: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_public: boolean
          mime_type: string
          object_key: string
          original_name: string
          size_bytes: number
          storage_path: string
          storage_region: string | null
          stored_name: string
          updated_at: string
          updated_by: string | null
          uploaded_by: string | null
          virus_scan_status: Database["public"]["Enums"]["virus_scan_status"]
        }
        Insert: {
          bucket: string
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_public?: boolean
          mime_type: string
          object_key: string
          original_name: string
          size_bytes: number
          storage_path: string
          storage_region?: string | null
          stored_name: string
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string | null
          virus_scan_status?: Database["public"]["Enums"]["virus_scan_status"]
        }
        Update: {
          bucket?: string
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_public?: boolean
          mime_type?: string
          object_key?: string
          original_name?: string
          size_bytes?: number
          storage_path?: string
          storage_region?: string | null
          stored_name?: string
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string | null
          virus_scan_status?: Database["public"]["Enums"]["virus_scan_status"]
        }
        Relationships: [
          {
            foreignKeyName: "files_deleted_by_fk"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploaded_by_fk"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_partners: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          partner_user_id: string | null
          slug: string
          status: string
          updated_at: string
          updated_by: string | null
          website_url: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          partner_user_id?: string | null
          slug: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          partner_user_id?: string | null
          slug?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_partners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_partners_partner_user_id_fkey"
            columns: ["partner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_partners_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_feedback: {
        Row: {
          created_at: string
          id: string
          interview_round_id: string
          notes: string | null
          rating: number | null
          recommendation: string
          reviewer_id: string | null
          strengths: string | null
          weaknesses: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interview_round_id: string
          notes?: string | null
          rating?: number | null
          recommendation?: string
          reviewer_id?: string | null
          strengths?: string | null
          weaknesses?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interview_round_id?: string
          notes?: string | null
          rating?: number | null
          recommendation?: string
          reviewer_id?: string | null
          strengths?: string | null
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_interview_round_id_fkey"
            columns: ["interview_round_id"]
            isOneToOne: false
            referencedRelation: "interview_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_rounds: {
        Row: {
          application_id: string
          created_at: string
          decision: string
          id: string
          meeting_id: string | null
          round_number: number
          round_type: string
          scheduled_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          decision?: string
          id?: string
          meeting_id?: string | null
          round_number: number
          round_type?: string
          scheduled_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          decision?: string
          id?: string
          meeting_id?: string | null
          round_number?: number
          round_type?: string
          scheduled_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_rounds_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "placement_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_rounds_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_rounds_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          invoice_number: string
          order_id: string
          pdf_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_number: string
          order_id: string
          pdf_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_number?: string
          order_id?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["order_id"]
          },
        ]
      }
      job_postings: {
        Row: {
          application_deadline: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string
          eligibility_criteria: Json
          employment_type: string
          hiring_partner_id: string
          id: string
          is_remote: boolean
          location: string | null
          max_package: number | null
          min_package: number | null
          openings_count: number
          skills_required: string[]
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          application_deadline?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description: string
          eligibility_criteria?: Json
          employment_type?: string
          hiring_partner_id: string
          id?: string
          is_remote?: boolean
          location?: string | null
          max_package?: number | null
          min_package?: number | null
          openings_count?: number
          skills_required?: string[]
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          application_deadline?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string
          eligibility_criteria?: Json
          employment_type?: string
          hiring_partner_id?: string
          id?: string
          is_remote?: boolean
          location?: string | null
          max_package?: number | null
          min_package?: number | null
          openings_count?: number
          skills_required?: string[]
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_hiring_partner_id_fkey"
            columns: ["hiring_partner_id"]
            isOneToOne: false
            referencedRelation: "hiring_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          lead_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          lead_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followups: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          scheduled_at: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          scheduled_at: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_followups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_private: boolean
          lead_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_private?: boolean
          lead_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          agent_conversation_id: string | null
          assigned_mentor_id: string | null
          budget: number | null
          career_goal: string | null
          city: string | null
          country: string | null
          course_interest_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          education: string | null
          email: string | null
          expected_joining_date: string | null
          experience_years: number | null
          id: string
          lead_score: number | null
          learning_mode: string | null
          name: string
          notes: string | null
          phone: string | null
          priority: string
          source_id: string | null
          status: string
          tags: string[] | null
          timeline: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          agent_conversation_id?: string | null
          assigned_mentor_id?: string | null
          budget?: number | null
          career_goal?: string | null
          city?: string | null
          country?: string | null
          course_interest_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          education?: string | null
          email?: string | null
          expected_joining_date?: string | null
          experience_years?: number | null
          id?: string
          lead_score?: number | null
          learning_mode?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          priority?: string
          source_id?: string | null
          status?: string
          tags?: string[] | null
          timeline?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          agent_conversation_id?: string | null
          assigned_mentor_id?: string | null
          budget?: number | null
          career_goal?: string | null
          city?: string | null
          country?: string | null
          course_interest_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          education?: string | null
          email?: string | null
          expected_joining_date?: string | null
          experience_years?: number | null
          id?: string
          lead_score?: number | null
          learning_mode?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          priority?: string
          source_id?: string | null
          status?: string
          tags?: string[] | null
          timeline?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_conversation_id_fkey"
            columns: ["agent_conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_course_interest_id_fkey"
            columns: ["course_interest_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          content: string
          course_id: string
          created_at: string
          deleted_at: string | null
          id: string
          lesson_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          lesson_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          lesson_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          last_accessed_at: string | null
          lesson_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          time_spent_seconds: number | null
          updated_at: string
          video_position_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          last_accessed_at?: string | null
          lesson_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          time_spent_seconds?: number | null
          updated_at?: string
          video_position_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          time_spent_seconds?: number | null
          updated_at?: string
          video_position_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lp_enrollment_fk"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lp_lesson_fk"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_seconds: number | null
          id: string
          is_free_preview: boolean
          module_id: string
          sort_order: number
          text_content: string | null
          title: string
          updated_at: string
          updated_by: string | null
          video_file_id: string | null
        }
        Insert: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean
          module_id: string
          sort_order?: number
          text_content?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          video_file_id?: string | null
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean
          module_id?: string
          sort_order?: number
          text_content?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_file_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_video_file_id_fkey"
            columns: ["video_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          id: string
          is_demo: boolean
          meeting_link: string | null
          meeting_platform: string
          mentor_id: string
          scheduled_date: string
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          is_demo?: boolean
          meeting_link?: string | null
          meeting_platform?: string
          mentor_id: string
          scheduled_date: string
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          is_demo?: boolean
          meeting_link?: string | null
          meeting_platform?: string
          mentor_id?: string
          scheduled_date?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          ends_at: string
          id: string
          is_recurring: boolean
          max_participants: number | null
          meeting_id: string | null
          meeting_password: string | null
          meeting_url: string | null
          mentor_id: string
          platform: string
          recording_url: string | null
          recurrence_rule: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          ends_at: string
          id?: string
          is_recurring?: boolean
          max_participants?: number | null
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_url?: string | null
          mentor_id: string
          platform?: string
          recording_url?: string | null
          recurrence_rule?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          ends_at?: string
          id?: string
          is_recurring?: boolean
          max_participants?: number | null
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_url?: string | null
          mentor_id?: string
          platform?: string
          recording_url?: string | null
          recurrence_rule?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          os: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          attendee_id: string | null
          created_at: string
          description: string | null
          ends_at: string
          entity_id: string | null
          entity_type: string | null
          host_id: string
          id: string
          location: string | null
          meet_url: string | null
          notes: string | null
          platform: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendee_id?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          entity_id?: string | null
          entity_type?: string | null
          host_id: string
          id?: string
          location?: string | null
          meet_url?: string | null
          notes?: string | null
          platform?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendee_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          entity_id?: string | null
          entity_type?: string | null
          host_id?: string
          id?: string
          location?: string | null
          meet_url?: string | null
          notes?: string | null
          platform?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_achievements: {
        Row: {
          achieved_on: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          mentor_id: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          achieved_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          mentor_id: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          achieved_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          mentor_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_achievements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_achievements_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_achievements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_certifications: {
        Row: {
          created_at: string
          created_by: string | null
          credential_url: string | null
          deleted_at: string | null
          id: string
          issue_date: string | null
          issuer: string
          issuer_logo_file_id: string | null
          mentor_id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credential_url?: string | null
          deleted_at?: string | null
          id?: string
          issue_date?: string | null
          issuer: string
          issuer_logo_file_id?: string | null
          mentor_id: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credential_url?: string | null
          deleted_at?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string
          issuer_logo_file_id?: string | null
          mentor_id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_certifications_issuer_logo_file_id_fkey"
            columns: ["issuer_logo_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_certifications_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_certifications_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          document_type: string
          file_id: string
          id: string
          is_current: boolean
          mentor_id: string
          notes: string | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          document_type: string
          file_id: string
          id?: string
          is_current?: boolean
          mentor_id: string
          notes?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          document_type?: string
          file_id?: string
          id?: string
          is_current?: boolean
          mentor_id?: string
          notes?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentor_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_documents_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_experience: {
        Row: {
          achievements: string[]
          company: string
          company_logo_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ends_on: string | null
          id: string
          is_current: boolean
          mentor_id: string
          responsibilities: string[]
          role: string
          sort_order: number
          starts_on: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          achievements?: string[]
          company: string
          company_logo_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ends_on?: string | null
          id?: string
          is_current?: boolean
          mentor_id: string
          responsibilities?: string[]
          role: string
          sort_order?: number
          starts_on: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          achievements?: string[]
          company?: string
          company_logo_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ends_on?: string | null
          id?: string
          is_current?: boolean
          mentor_id?: string
          responsibilities?: string[]
          role?: string
          sort_order?: number
          starts_on?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_experience_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_experience_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_experience_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_invites: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_at: string
          invited_by: string
          message: string | null
          status: string
          temp_password: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invited_at?: string
          invited_by: string
          message?: string | null
          status?: string
          temp_password?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_at?: string
          invited_by?: string
          message?: string | null
          status?: string
          temp_password?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_invites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          mentor_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          mentor_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          mentor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_notes_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_permissions: {
        Row: {
          can_create_courses: boolean
          can_manage_students: boolean
          can_publish_courses: boolean
          can_send_broadcast: boolean
          can_view_revenue: boolean
          created_at: string
          id: string
          max_courses: number | null
          mentor_profile_id: string
          updated_at: string
        }
        Insert: {
          can_create_courses?: boolean
          can_manage_students?: boolean
          can_publish_courses?: boolean
          can_send_broadcast?: boolean
          can_view_revenue?: boolean
          created_at?: string
          id?: string
          max_courses?: number | null
          mentor_profile_id: string
          updated_at?: string
        }
        Update: {
          can_create_courses?: boolean
          can_manage_students?: boolean
          can_publish_courses?: boolean
          can_send_broadcast?: boolean
          can_view_revenue?: boolean
          created_at?: string
          id?: string
          max_courses?: number | null
          mentor_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_permissions_mentor_profile_id_fkey"
            columns: ["mentor_profile_id"]
            isOneToOne: true
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          availability_hours: Json | null
          bio: string | null
          certifications: Json
          company: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          experience_years: number | null
          expertise: string[]
          github_url: string | null
          headline: string | null
          id: string
          is_verified: boolean
          linkedin_url: string | null
          locked_at: string | null
          locked_by: string | null
          locked_reason: string | null
          login_disabled: boolean
          login_disabled_by_deletion: boolean
          payout_details: Json
          portfolio_url: string | null
          skills: string[] | null
          social_links: Json
          status: string
          twitter_url: string | null
          updated_at: string
          updated_by: string | null
          website_url: string | null
          years_of_experience: number | null
          youtube_url: string | null
        }
        Insert: {
          availability_hours?: Json | null
          bio?: string | null
          certifications?: Json
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          experience_years?: number | null
          expertise?: string[]
          github_url?: string | null
          headline?: string | null
          id: string
          is_verified?: boolean
          linkedin_url?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          login_disabled?: boolean
          login_disabled_by_deletion?: boolean
          payout_details?: Json
          portfolio_url?: string | null
          skills?: string[] | null
          social_links?: Json
          status?: string
          twitter_url?: string | null
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          years_of_experience?: number | null
          youtube_url?: string | null
        }
        Update: {
          availability_hours?: Json | null
          bio?: string | null
          certifications?: Json
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          experience_years?: number | null
          expertise?: string[]
          github_url?: string | null
          headline?: string | null
          id?: string
          is_verified?: boolean
          linkedin_url?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_reason?: string | null
          login_disabled?: boolean
          login_disabled_by_deletion?: boolean
          payout_details?: Json
          portfolio_url?: string | null
          skills?: string[] | null
          social_links?: Json
          status?: string
          twitter_url?: string | null
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          years_of_experience?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profiles_profile_fk"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_projects: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          difficulty: string | null
          github_url: string | null
          id: string
          image_file_id: string | null
          industry: string | null
          live_url: string | null
          mentor_id: string
          sort_order: number
          tech_stack: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          github_url?: string | null
          id?: string
          image_file_id?: string | null
          industry?: string | null
          live_url?: string | null
          mentor_id: string
          sort_order?: number
          tech_stack?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          github_url?: string | null
          id?: string
          image_file_id?: string | null
          industry?: string | null
          live_url?: string | null
          mentor_id?: string
          sort_order?: number
          tech_stack?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_projects_image_file_id_fkey"
            columns: ["image_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_projects_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_projects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          message_id: string
          storage_path: string
          url: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          message_id: string
          storage_path: string
          url?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          message_id?: string
          storage_path?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          announcements: boolean
          assignment_alerts: boolean
          certificate_alerts: boolean
          chat_messages: boolean
          course_updates: boolean
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          payment_alerts: boolean
          system_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          announcements?: boolean
          assignment_alerts?: boolean
          certificate_alerts?: boolean
          chat_messages?: boolean
          course_updates?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          payment_alerts?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          announcements?: boolean
          assignment_alerts?: boolean
          certificate_alerts?: boolean
          chat_messages?: boolean
          course_updates?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          payment_alerts?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          sender_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          sender_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_id: string
          price: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_id: string
          price?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["order_id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          currency: string
          discount_amount: number | null
          failure_reason: string | null
          id: string
          notes: string | null
          razorpay_order_id: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          razorpay_order_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          razorpay_order_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string | null
          id: string
          logo_url: string | null
          metadata: Json
          name: string
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json
          name: string
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          created_at: string
          error: string | null
          event: string
          id: string
          order_id: string | null
          payload: Json | null
          payment_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          payment_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payment_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["payment_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank: string | null
          card_last4: string | null
          created_at: string
          failure_code: string | null
          failure_reason: string | null
          id: string
          international: boolean | null
          method: string | null
          order_id: string
          provider: string
          provider_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          vpa: string | null
          wallet: string | null
        }
        Insert: {
          amount: number
          bank?: string | null
          card_last4?: string | null
          created_at?: string
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          international?: boolean | null
          method?: string | null
          order_id: string
          provider: string
          provider_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          vpa?: string | null
          wallet?: string | null
        }
        Update: {
          amount?: number
          bank?: string | null
          card_last4?: string | null
          created_at?: string
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          international?: boolean | null
          method?: string | null
          order_id?: string
          provider?: string
          provider_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          vpa?: string | null
          wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["order_id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          module: string
          name: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          module: string
          name: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          module?: string
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_items: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          position: number
          stage_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          position?: number
          stage_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          position?: number
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_items_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pipeline_id: string
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          position?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_applications: {
        Row: {
          applied_at: string
          cover_note: string | null
          id: string
          job_posting_id: string
          rejected_reason: string | null
          resume_file_id: string | null
          status: string
          student_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          applied_at?: string
          cover_note?: string | null
          id?: string
          job_posting_id: string
          rejected_reason?: string | null
          resume_file_id?: string | null
          status?: string
          student_id: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          applied_at?: string
          cover_note?: string | null
          id?: string
          job_posting_id?: string
          rejected_reason?: string | null
          resume_file_id?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placement_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_applications_resume_file_id_fkey"
            columns: ["resume_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_offers: {
        Row: {
          application_id: string
          currency: string
          designation: string | null
          id: string
          joining_date: string | null
          offer_letter_file_id: string | null
          package_amount: number
          released_at: string
          released_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          currency?: string
          designation?: string | null
          id?: string
          joining_date?: string | null
          offer_letter_file_id?: string | null
          package_amount: number
          released_at?: string
          released_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          currency?: string
          designation?: string | null
          id?: string
          joining_date?: string | null
          offer_letter_file_id?: string | null
          package_amount?: number
          released_at?: string
          released_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "placement_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_offers_offer_letter_file_id_fkey"
            columns: ["offer_letter_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_offers_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_status_history: {
        Row: {
          application_id: string
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          note: string | null
          to_status: string
        }
        Insert: {
          application_id: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
        }
        Update: {
          application_id?: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "placement_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_file_id: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          deleted_at: string | null
          email: string
          full_name: string
          gender: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          metadata: Json
          org_id: string | null
          phone: string | null
          portfolio_url: string | null
          profile_completion_pct: number
          search_vector: unknown
          state: string | null
          twitter_url: string | null
          updated_at: string
          updated_by: string | null
          username: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          avatar_file_id?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email: string
          full_name?: string
          gender?: string | null
          github_url?: string | null
          id: string
          linkedin_url?: string | null
          metadata?: Json
          org_id?: string | null
          phone?: string | null
          portfolio_url?: string | null
          profile_completion_pct?: number
          search_vector?: unknown
          state?: string | null
          twitter_url?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          avatar_file_id?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          metadata?: Json
          org_id?: string | null
          phone?: string | null
          portfolio_url?: string | null
          profile_completion_pct?: number
          search_vector?: unknown
          state?: string | null
          twitter_url?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_file_fk"
            columns: ["avatar_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option_id: string | null
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option_id?: string | null
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qans_attempt_fk"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qans_option_fk"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qans_question_fk"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          ai_feedback_generated: boolean | null
          attempt_number: number
          created_at: string
          enrollment_id: string
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          submitted_at: string | null
          time_taken_seconds: number | null
          updated_at: string
        }
        Insert: {
          ai_feedback_generated?: boolean | null
          attempt_number?: number
          created_at?: string
          enrollment_id: string
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_taken_seconds?: number | null
          updated_at?: string
        }
        Update: {
          ai_feedback_generated?: boolean | null
          attempt_number?: number
          created_at?: string
          enrollment_id?: string
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_taken_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_enrollment_fk"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_quiz_fk"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "qo_question_fk"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qq_quiz_fk"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_published: boolean
          lesson_id: string | null
          module_id: string | null
          passing_score: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          module_id?: string | null
          passing_score?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          module_id?: string | null
          passing_score?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qz_course_fk"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qz_module_fk"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          initiated_by: string | null
          notes: string | null
          order_id: string
          payment_id: string
          processed_at: string | null
          razorpay_refund_id: string | null
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          initiated_by?: string | null
          notes?: string | null
          order_id: string
          payment_id: string
          processed_at?: string | null
          razorpay_refund_id?: string | null
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          initiated_by?: string | null
          notes?: string | null
          order_id?: string
          payment_id?: string
          processed_at?: string | null
          razorpay_refund_id?: string | null
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["payment_id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_id: string
          id: string
          lesson_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_id: string
          id?: string
          lesson_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_id?: string
          id?: string
          lesson_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_achievements: {
        Row: {
          created_at: string
          date_achieved: string | null
          deleted_at: string | null
          description: string | null
          id: string
          sort_order: number
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_achieved?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_achieved?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_certifications: {
        Row: {
          created_at: string
          credential_url: string | null
          deleted_at: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
          sort_order: number
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_url?: string | null
          deleted_at?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
          sort_order?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_url?: string | null
          deleted_at?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
          sort_order?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_certifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_experience: {
        Row: {
          company: string
          created_at: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean
          location: string | null
          sort_order: number
          start_date: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          sort_order?: number
          start_date: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          sort_order?: number
          start_date?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_experience_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          project_url: string | null
          sort_order: number
          student_id: string
          tech_stack: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          project_url?: string | null
          sort_order?: number
          student_id: string
          tech_stack?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          project_url?: string | null
          sort_order?: number
          student_id?: string
          tech_stack?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_projects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          permission_id: string
          role_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          permission_id: string
          role_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          permission_id?: string
          role_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      saved_placements: {
        Row: {
          created_at: string
          id: string
          job_posting_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_posting_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_posting_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_placements_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_placements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_private: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_private?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          college: string | null
          created_at: string
          created_by: string | null
          education: string | null
          goals: Json
          graduation_year: number | null
          id: string
          interests: string[]
          resume_file_id: string | null
          skills: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          college?: string | null
          created_at?: string
          created_by?: string | null
          education?: string | null
          goals?: Json
          graduation_year?: number | null
          id: string
          interests?: string[]
          resume_file_id?: string | null
          skills?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          college?: string | null
          created_at?: string
          created_by?: string | null
          education?: string | null
          goals?: Json
          graduation_year?: number | null
          id?: string
          interests?: string[]
          resume_file_id?: string | null
          skills?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_profile_fk"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_resume_file_fk"
            columns: ["resume_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      success_stories: {
        Row: {
          candidate_video_url: string | null
          company_name: string | null
          course_id: string | null
          created_at: string
          featured: boolean
          full_story: string | null
          id: number
          image_url: string | null
          job_role: string | null
          package: string | null
          published: boolean
          testimonial: string | null
          title: string
        }
        Insert: {
          candidate_video_url?: string | null
          company_name?: string | null
          course_id?: string | null
          created_at?: string
          featured?: boolean
          full_story?: string | null
          id?: number
          image_url?: string | null
          job_role?: string | null
          package?: string | null
          published?: boolean
          testimonial?: string | null
          title: string
        }
        Update: {
          candidate_video_url?: string | null
          company_name?: string | null
          course_id?: string | null
          created_at?: string
          featured?: boolean
          full_story?: string | null
          id?: number
          image_url?: string | null
          job_role?: string | null
          package?: string | null
          published?: boolean
          testimonial?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_stories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          assigner_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assigner_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assigner_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigner_id_fkey"
            columns: ["assigner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          id: string
          is_approved: boolean | null
          mentor_replied_at: string | null
          mentor_reply: string | null
          rating: number | null
          student_id: string | null
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          mentor_replied_at?: string | null
          mentor_reply?: string | null
          rating?: number | null
          student_id?: string | null
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          mentor_replied_at?: string | null
          mentor_reply?: string | null
          rating?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          is_granted: boolean
          permission_id: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_granted?: boolean
          permission_id: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_granted?: boolean
          permission_id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          revoked_at: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          revoked_at?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          revoked_at?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ur_assigned_by_fk"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ur_role_fk"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ur_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          device_info: string | null
          ended_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean
          started_at: string
          updated_at: string
          updated_by: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          device_info?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          started_at?: string
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          device_info?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          started_at?: string
          updated_at?: string
          updated_by?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          language: string
          notification_prefs: Json
          password_reset_required: boolean
          theme: string
          timezone: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          language?: string
          notification_prefs?: Json
          password_reset_required?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          language?: string
          notification_prefs?: Json
          password_reset_required?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_statistics: {
        Row: {
          active_students: number
          assignments_checked: number
          average_rating: number
          completed_courses: number
          courses_completed: number
          courses_enrolled: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          total_students: number
          total_study_minutes: number
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          active_students?: number
          assignments_checked?: number
          average_rating?: number
          completed_courses?: number
          courses_completed?: number
          courses_enrolled?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          total_students?: number
          total_study_minutes?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          active_students?: number
          assignments_checked?: number
          average_rating?: number
          completed_courses?: number
          courses_completed?: number
          courses_enrolled?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          total_students?: number
          total_study_minutes?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_statistics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_statistics_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      course_rating_summary: {
        Row: {
          avg_rating: number | null
          course_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          currency: string | null
          discount_amount: number | null
          method: string | null
          order_created_at: string | null
          order_id: string | null
          order_status: string | null
          payment_amount: number | null
          payment_created_at: string | null
          payment_id: string | null
          payment_status: string | null
          provider: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          refund_amount: number | null
          refund_id: string | null
          refund_status: string | null
          student_email: string | null
          student_name: string | null
          total_amount: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_restore_mentor: {
        Args: { p_mentor_id: string }
        Returns: undefined
      }
      admin_soft_delete_mentor: {
        Args: { p_mentor_id: string }
        Returns: undefined
      }
      advance_application_stage: {
        Args: {
          p_application_id: string
          p_new_status: string
          p_note?: string
        }
        Returns: undefined
      }
      apply_to_job: {
        Args: {
          p_cover_note?: string
          p_job_posting_id: string
          p_resume_file_id: string
        }
        Returns: string
      }
      assert_login_allowed: { Args: never; Returns: undefined }
      calculate_profile_completion: {
        Args: { profile_id: string }
        Returns: number
      }
      current_user_permissions: { Args: never; Returns: string[] }
      force_logout_user: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      get_course_id_for_lesson: {
        Args: { p_lesson_id: string }
        Returns: string
      }
      get_course_id_for_module: {
        Args: { p_module_id: string }
        Returns: string
      }
      get_current_identity: { Args: never; Returns: Json }
      get_current_permissions: { Args: never; Returns: string[] }
      get_current_roles: { Args: never; Returns: string[] }
      get_mentor_available_slots: {
        Args: {
          p_end_date: string
          p_mentor_id: string
          p_slot_minutes?: number
          p_start_date: string
        }
        Returns: {
          slot_end: string
          slot_start: string
        }[]
      }
      get_public_course_certificate_availability: {
        Args: { p_course_ids: string[] }
        Returns: {
          course_id: string
        }[]
      }
      get_public_course_enrollment_counts: {
        Args: { p_course_ids: string[] }
        Returns: {
          course_id: string
          enrollment_count: number
        }[]
      }
      get_public_course_project_counts: {
        Args: { p_course_ids: string[] }
        Returns: {
          course_id: string
          project_count: number
        }[]
      }
      get_public_mentor_profiles: {
        Args: { p_mentor_ids: string[] }
        Returns: {
          avatar_file_id: string
          city: string
          country: string
          full_name: string
          id: string
        }[]
      }
      get_public_mentor_student_counts: {
        Args: { p_mentor_ids: string[] }
        Returns: {
          mentor_id: string
          student_count: number
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id?: string }
        Returns: number
      }
      global_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      has_active_enrollment: { Args: { p_course_id: string }; Returns: boolean }
      has_permission: { Args: { _permission_code: string }; Returns: boolean }
      has_role: { Args: { _role_code: string }; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_course_mentor: { Args: { p_course_id: string }; Returns: boolean }
      list_authorized_message_recipients: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      log_login_event: {
        Args: {
          p_browser?: string
          p_device_type?: string
          p_os?: string
          p_user_agent?: string
        }
        Returns: string
      }
      mark_placement_joined: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      match_agent_knowledge: {
        Args: {
          filter_category?: string
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          chunk_id: string
          content: string
          document_category: string
          document_id: string
          document_title: string
          similarity: number
        }[]
      }
      notify_admins_category_proposed: {
        Args: { p_category_id: string }
        Returns: undefined
      }
      notify_admins_course_submitted: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      notify_admins_job_submitted: {
        Args: { p_job_posting_id: string }
        Returns: undefined
      }
      notify_new_message: {
        Args: { p_conversation_id: string; p_message_preview: string }
        Returns: undefined
      }
      record_interview_feedback: {
        Args: {
          p_decision: string
          p_interview_round_id: string
          p_notes?: string
          p_rating?: number
          p_recommendation?: string
          p_strengths?: string
          p_weaknesses?: string
        }
        Returns: string
      }
      release_offer: {
        Args: {
          p_application_id: string
          p_currency?: string
          p_designation?: string
          p_joining_date?: string
          p_offer_letter_file_id?: string
          p_package_amount: number
        }
        Returns: string
      }
      reply_to_testimonial: {
        Args: { p_reply: string; p_testimonial_id: string }
        Returns: {
          content: string
          course_id: string | null
          created_at: string
          id: string
          is_approved: boolean | null
          mentor_replied_at: string | null
          mentor_reply: string | null
          rating: number | null
          student_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "testimonials"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_campaign_audience: {
        Args: { p_campaign_id: string; p_selected_recipient_ids?: string[] }
        Returns: number
      }
      schedule_interview_round: {
        Args: {
          p_application_id: string
          p_ends_at: string
          p_meet_url?: string
          p_notes?: string
          p_platform?: string
          p_round_number: number
          p_round_type: string
          p_stage_status: string
          p_starts_at: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_direct_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      submit_quiz_attempt: {
        Args: {
          p_enrollment_id: string
          p_quiz_id: string
          p_selected_option_ids: string[]
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      upsert_my_student_profile: {
        Args: {
          p_college?: string
          p_education?: string
          p_graduation_year?: number
          p_skills?: string[]
        }
        Returns: undefined
      }
      user_has_role: {
        Args: { p_role_code: string; p_user_id: string }
        Returns: boolean
      }
      verify_certificate_by_code: {
        Args: { p_code: string }
        Returns: {
          certificate_number: string
          course_title: string
          id: string
          issued_at: string
          student_name: string
          verification_code: string
        }[]
      }
      withdraw_application: {
        Args: { p_application_id: string }
        Returns: undefined
      }
    }
    Enums: {
      audit_severity: "info" | "warning" | "error" | "critical"
      blog_status: "draft" | "published" | "archived"
      content_type: "video" | "text" | "pdf" | "quiz" | "assignment"
      course_level: "beginner" | "intermediate" | "advanced" | "all_levels"
      course_status: "draft" | "under_review" | "published" | "archived"
      delivery_status: "pending" | "sent" | "delivered" | "failed"
      enrollment_source:
        | "manual"
        | "purchase"
        | "coupon"
        | "scholarship"
        | "admin"
        | "mentor"
        | "system"
        | "migration"
      enrollment_status: "active" | "completed" | "expired" | "cancelled"
      notification_channel: "in_app" | "email" | "push" | "sms"
      notification_priority: "low" | "normal" | "high" | "urgent"
      order_status: "pending" | "completed" | "cancelled" | "refunded"
      org_status: "active" | "suspended" | "archived"
      payment_status:
        | "initiated"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
      payout_status: "pending" | "processing" | "completed" | "failed"
      pricing_type: "free" | "one_time" | "subscription"
      progress_status: "not_started" | "in_progress" | "completed"
      question_type: "mcq" | "multi_select" | "true_false" | "short_answer"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
      video_status: "pending" | "processing" | "ready" | "failed"
      virus_scan_status: "pending" | "clean" | "infected" | "skipped"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_severity: ["info", "warning", "error", "critical"],
      blog_status: ["draft", "published", "archived"],
      content_type: ["video", "text", "pdf", "quiz", "assignment"],
      course_level: ["beginner", "intermediate", "advanced", "all_levels"],
      course_status: ["draft", "under_review", "published", "archived"],
      delivery_status: ["pending", "sent", "delivered", "failed"],
      enrollment_source: [
        "manual",
        "purchase",
        "coupon",
        "scholarship",
        "admin",
        "mentor",
        "system",
        "migration",
      ],
      enrollment_status: ["active", "completed", "expired", "cancelled"],
      notification_channel: ["in_app", "email", "push", "sms"],
      notification_priority: ["low", "normal", "high", "urgent"],
      order_status: ["pending", "completed", "cancelled", "refunded"],
      org_status: ["active", "suspended", "archived"],
      payment_status: [
        "initiated",
        "processing",
        "succeeded",
        "failed",
        "refunded",
      ],
      payout_status: ["pending", "processing", "completed", "failed"],
      pricing_type: ["free", "one_time", "subscription"],
      progress_status: ["not_started", "in_progress", "completed"],
      question_type: ["mcq", "multi_select", "true_false", "short_answer"],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["open", "in_progress", "waiting", "resolved", "closed"],
      video_status: ["pending", "processing", "ready", "failed"],
      virus_scan_status: ["pending", "clean", "infected", "skipped"],
    },
  },
} as const
