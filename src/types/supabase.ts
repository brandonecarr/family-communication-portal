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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          accent_color: string | null
          address: string | null
          admin_email_pending: string | null
          admin_user_id: string | null
          city: string | null
          created_at: string | null
          custom_domain: string | null
          email: string | null
          id: string
          logo_url: string | null
          max_patients: number | null
          max_staff: number | null
          name: string
          onboarding_completed: boolean | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          state: string | null
          status: string | null
          subscription_tier: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          admin_email_pending?: string | null
          admin_user_id?: string | null
          city?: string | null
          created_at?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_patients?: number | null
          max_staff?: number | null
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          admin_email_pending?: string | null
          admin_user_id?: string | null
          city?: string | null
          created_at?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_patients?: number | null
          max_staff?: number | null
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      agency_users: {
        Row: {
          agency_id: string | null
          created_at: string | null
          id: string
          job_role: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          job_role?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          job_role?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bereavement_campaigns: {
        Row: {
          active: boolean | null
          agency_id: string | null
          created_at: string | null
          id: string
          name: string
          sequence: Json
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          agency_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          sequence: Json
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          agency_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sequence?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bereavement_campaigns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bereavement_enrollments: {
        Row: {
          campaign_id: string | null
          completed: boolean | null
          current_step: number | null
          enrolled_at: string | null
          id: string
          patient_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          completed?: boolean | null
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          patient_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          completed?: boolean | null
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bereavement_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bereavement_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bereavement_enrollments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          content: string
          created_at: string | null
          id: string
          language: string | null
          patient_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          language?: string | null
          patient_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          language?: string | null
          patient_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_team_members: {
        Row: {
          agency_id: string | null
          created_at: string | null
          description: string | null
          discipline: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          name: string | null
          phone: string | null
          photo_url: string | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          description?: string | null
          discipline?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          description?: string | null
          discipline?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_team_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          carrier: string | null
          created_at: string | null
          estimated_delivery: string | null
          estimated_delivery_date: string | null
          id: string
          item_name: string
          last_update: string | null
          notes: string | null
          patient_id: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          estimated_delivery?: string | null
          estimated_delivery_date?: string | null
          id?: string
          item_name: string
          last_update?: string | null
          notes?: string | null
          patient_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          estimated_delivery?: string | null
          estimated_delivery_date?: string | null
          id?: string
          item_name?: string
          last_update?: string | null
          notes?: string | null
          patient_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      education_modules: {
        Row: {
          agency_id: string | null
          category: string | null
          content: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          language: string | null
          order_index: number | null
          published: boolean | null
          thumbnail: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          content?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          language?: string | null
          order_index?: number | null
          published?: boolean | null
          thumbnail?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          content?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          language?: string | null
          order_index?: number | null
          published?: boolean | null
          thumbnail?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_modules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_invites: {
        Row: {
          accepted_at: string | null
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: string | null
          setup_url: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          role?: string | null
          setup_url?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: string | null
          setup_url?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_invites_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      family_invitations: {
        Row: {
          created_at: string | null
          email: string
          id: string
          invited_by: string
          name: string
          patient_id: string | null
          phone: string | null
          relationship: string
          role: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          invited_by: string
          name: string
          patient_id?: string | null
          phone?: string | null
          relationship: string
          role?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string
          name?: string
          patient_id?: string | null
          phone?: string | null
          relationship?: string
          role?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          invite_expires_at: string | null
          invite_sent_at: string | null
          invite_token: string | null
          is_primary_contact: boolean | null
          name: string | null
          patient_id: string | null
          phone: string | null
          preferred_language: string | null
          relationship: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          is_primary_contact?: boolean | null
          name?: string | null
          patient_id?: string | null
          phone?: string | null
          preferred_language?: string | null
          relationship?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          is_primary_contact?: boolean | null
          name?: string | null
          patient_id?: string | null
          phone?: string | null
          preferred_language?: string | null
          relationship?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "thread_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          agency_id: string
          archived_at: string | null
          category: Database["public"]["Enums"]["message_category"]
          created_at: string | null
          created_by: string
          id: string
          is_group: boolean | null
          last_message_at: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          archived_at?: string | null
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string | null
          created_by: string
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          archived_at?: string | null
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string | null
          created_by?: string
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          body: string
          created_at: string | null
          id: string
          parent_message_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["message_priority"] | null
          read: boolean | null
          recipient_id: string | null
          sender_id: string | null
          sender_type: string
          status: Database["public"]["Enums"]["message_status"] | null
          subject: string | null
          topic_tag: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          body: string
          created_at?: string | null
          id?: string
          parent_message_id?: string | null
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["message_priority"] | null
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
          sender_type: string
          status?: Database["public"]["Enums"]["message_status"] | null
          subject?: string | null
          topic_tag?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          body?: string
          created_at?: string | null
          id?: string
          parent_message_id?: string | null
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["message_priority"] | null
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
          sender_type?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          subject?: string | null
          topic_tag?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      module_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          module_id: string | null
          progress: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_id?: string | null
          progress?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_id?: string | null
          progress?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "education_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          read: boolean | null
          reference_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          reference_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      patient_care_team: {
        Row: {
          assigned_at: string | null
          care_team_member_id: string | null
          id: string
          patient_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          care_team_member_id?: string | null
          id?: string
          patient_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          care_team_member_id?: string | null
          id?: string
          patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_care_team_care_team_member_id_fkey"
            columns: ["care_team_member_id"]
            isOneToOne: false
            referencedRelation: "care_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_care_team_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          admission_date: string | null
          agency_id: string | null
          created_at: string | null
          date_of_birth: string | null
          date_of_death: string | null
          discharge_date: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          name: string | null
          phone: string | null
          previous_status: Database["public"]["Enums"]["patient_status"] | null
          status: Database["public"]["Enums"]["patient_status"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          agency_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          date_of_death?: string | null
          discharge_date?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          name?: string | null
          phone?: string | null
          previous_status?: Database["public"]["Enums"]["patient_status"] | null
          status?: Database["public"]["Enums"]["patient_status"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          agency_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          date_of_death?: string | null
          discharge_date?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          name?: string | null
          phone?: string | null
          previous_status?: Database["public"]["Enums"]["patient_status"] | null
          status?: Database["public"]["Enums"]["patient_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          delivery_notes: string | null
          fulfilled_at: string | null
          id: string
          items: Json
          patient_id: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["supply_request_status"] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          fulfilled_at?: string | null
          id?: string
          items: Json
          patient_id?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["supply_request_status"] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          fulfilled_at?: string | null
          id?: string
          items?: Json
          patient_id?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["supply_request_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          agency_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by_name: string | null
          role: string
          status: string | null
          token: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by_name?: string | null
          role: string
          status?: string | null
          token: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by_name?: string | null
          role?: string
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string | null
          edited_at: string | null
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_participants: {
        Row: {
          id: string
          is_admin: boolean | null
          joined_at: string | null
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          image: string | null
          name: string | null
          needs_password_setup: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          role: string | null
          token_identifier: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          image?: string | null
          name?: string | null
          needs_password_setup?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: string | null
          token_identifier: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          image?: string | null
          name?: string | null
          needs_password_setup?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: string | null
          token_identifier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      visit_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          flagged: boolean | null
          flagged_for_followup: boolean | null
          followed_up_at: string | null
          followed_up_by: string | null
          id: string
          rating: number | null
          resolved: boolean | null
          submitted_by: string | null
          visit_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          flagged?: boolean | null
          flagged_for_followup?: boolean | null
          followed_up_at?: string | null
          followed_up_by?: string | null
          id?: string
          rating?: number | null
          resolved?: boolean | null
          submitted_by?: string | null
          visit_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          flagged?: boolean | null
          flagged_for_followup?: boolean | null
          followed_up_at?: string | null
          followed_up_by?: string | null
          id?: string
          rating?: number | null
          resolved?: boolean | null
          submitted_by?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_feedback_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          care_team_member_id: string | null
          created_at: string | null
          date: string | null
          discipline: string | null
          id: string
          notes: string | null
          patient_id: string | null
          scheduled_date: string
          scheduled_time: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          staff_id: string | null
          staff_name: string | null
          status: Database["public"]["Enums"]["visit_status"] | null
          time_window_end: string | null
          time_window_start: string | null
          updated_at: string | null
        }
        Insert: {
          care_team_member_id?: string | null
          created_at?: string | null
          date?: string | null
          discipline?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          staff_id?: string | null
          staff_name?: string | null
          status?: Database["public"]["Enums"]["visit_status"] | null
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string | null
        }
        Update: {
          care_team_member_id?: string | null
          created_at?: string | null
          date?: string | null
          discipline?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          staff_id?: string | null
          staff_name?: string | null
          status?: Database["public"]["Enums"]["visit_status"] | null
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_care_team_member_id_fkey"
            columns: ["care_team_member_id"]
            isOneToOne: false
            referencedRelation: "care_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "care_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_threads: { Args: never; Returns: undefined }
      get_user_agency_id: { Args: never; Returns: string }
      is_agency_admin: { Args: { check_agency_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      delivery_status:
        | "ordered"
        | "shipped"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "exception"
      message_category: "internal" | "family"
      message_priority: "low" | "normal" | "high" | "urgent"
      message_status: "sent" | "delivered" | "read"
      patient_status:
        | "active"
        | "discharged"
        | "deceased"
        | "archived"
        | "inactive"
      supply_request_status: "pending" | "approved" | "fulfilled" | "cancelled"
      user_role:
        | "family_admin"
        | "family_member"
        | "agency_admin"
        | "agency_staff"
        | "super_admin"
      visit_status:
        | "scheduled"
        | "en_route"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "rescheduled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      delivery_status: [
        "ordered",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "exception",
      ],
      message_category: ["internal", "family"],
      message_priority: ["low", "normal", "high", "urgent"],
      message_status: ["sent", "delivered", "read"],
      patient_status: [
        "active",
        "discharged",
        "deceased",
        "archived",
        "inactive",
      ],
      supply_request_status: ["pending", "approved", "fulfilled", "cancelled"],
      user_role: [
        "family_admin",
        "family_member",
        "agency_admin",
        "agency_staff",
        "super_admin",
      ],
      visit_status: [
        "scheduled",
        "en_route",
        "in_progress",
        "completed",
        "cancelled",
        "rescheduled",
      ],
    },
  },
} as const
