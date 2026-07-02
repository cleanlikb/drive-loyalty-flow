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
      activity_log: {
        Row: {
          created_at: string
          dealer_id: string
          id: string
          kind: string
          payload: Json
        }
        Insert: {
          created_at?: string
          dealer_id: string
          id?: string
          kind: string
          payload?: Json
        }
        Update: {
          created_at?: string
          dealer_id?: string
          id?: string
          kind?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_customers: {
        Row: {
          cohort_id: string
          created_at: string
          customer_id: string
          dealer_id: string
          id: string
          milestone_months: number
          selected: boolean
          sequence_id: string | null
        }
        Insert: {
          cohort_id: string
          created_at?: string
          customer_id: string
          dealer_id: string
          id?: string
          milestone_months: number
          selected?: boolean
          sequence_id?: string | null
        }
        Update: {
          cohort_id?: string
          created_at?: string
          customer_id?: string
          dealer_id?: string
          id?: string
          milestone_months?: number
          selected?: boolean
          sequence_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_customers_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_customers_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          dealer_id: string
          id: string
          month: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          id?: string
          month: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          id?: string
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          dealer_id: string
          email: string | null
          finance_term_months: number | null
          finance_type: string | null
          hot_lead_at: string | null
          id: string
          is_hot_lead: boolean
          last_contacted_at: string | null
          make: string | null
          model: string | null
          name: string
          next_car_notes: string | null
          sale_date: string | null
          sale_price: number | null
          status: Database["public"]["Enums"]["customer_status"]
          trim: string | null
          vehicle_reg: string | null
        }
        Insert: {
          created_at?: string
          dealer_id: string
          email?: string | null
          finance_term_months?: number | null
          finance_type?: string | null
          hot_lead_at?: string | null
          id?: string
          is_hot_lead?: boolean
          last_contacted_at?: string | null
          make?: string | null
          model?: string | null
          name: string
          next_car_notes?: string | null
          sale_date?: string | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["customer_status"]
          trim?: string | null
          vehicle_reg?: string | null
        }
        Update: {
          created_at?: string
          dealer_id?: string
          email?: string | null
          finance_term_months?: number | null
          finance_type?: string | null
          hot_lead_at?: string | null
          id?: string
          is_hot_lead?: boolean
          last_contacted_at?: string | null
          make?: string | null
          model?: string | null
          name?: string
          next_car_notes?: string | null
          sale_date?: string | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["customer_status"]
          trim?: string | null
          vehicle_reg?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      dealers: {
        Row: {
          created_at: string
          dealership_name: string | null
          forward_replies: boolean
          id: string
          notification_email: string | null
          onboarded_at: string | null
          salesperson_name: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          dealership_name?: string | null
          forward_replies?: boolean
          id?: string
          notification_email?: string | null
          onboarded_at?: string | null
          salesperson_name?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          dealership_name?: string | null
          forward_replies?: boolean
          id?: string
          notification_email?: string | null
          onboarded_at?: string | null
          salesperson_name?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dealer_id: string
          id: string
          kind: string
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dealer_id: string
          id?: string
          kind: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dealer_id?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      replies: {
        Row: {
          classification: Database["public"]["Enums"]["reply_classification"]
          confidence: number | null
          created_at: string
          customer_id: string
          dealer_id: string
          forwarded_at: string | null
          from_email: string | null
          id: string
          in_reply_to: string | null
          manual_override: boolean
          message_id: string | null
          next_car_notes: string | null
          raw_text: string
          rescanned_at: string | null
          sequence_id: string | null
          subject: string | null
          summary: string | null
        }
        Insert: {
          classification?: Database["public"]["Enums"]["reply_classification"]
          confidence?: number | null
          created_at?: string
          customer_id: string
          dealer_id: string
          forwarded_at?: string | null
          from_email?: string | null
          id?: string
          in_reply_to?: string | null
          manual_override?: boolean
          message_id?: string | null
          next_car_notes?: string | null
          raw_text: string
          rescanned_at?: string | null
          sequence_id?: string | null
          subject?: string | null
          summary?: string | null
        }
        Update: {
          classification?: Database["public"]["Enums"]["reply_classification"]
          confidence?: number | null
          created_at?: string
          customer_id?: string
          dealer_id?: string
          forwarded_at?: string | null
          from_email?: string | null
          id?: string
          in_reply_to?: string | null
          manual_override?: boolean
          message_id?: string | null
          next_car_notes?: string | null
          raw_text?: string
          rescanned_at?: string | null
          sequence_id?: string | null
          subject?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_emails: {
        Row: {
          body: string
          dealer_id: string
          id: string
          message_id: string | null
          scheduled_for: string | null
          send_offset_days: number
          sent_at: string | null
          sequence_id: string
          status: Database["public"]["Enums"]["email_status"]
          step: number
          subject: string
        }
        Insert: {
          body: string
          dealer_id: string
          id?: string
          message_id?: string | null
          scheduled_for?: string | null
          send_offset_days: number
          sent_at?: string | null
          sequence_id: string
          status?: Database["public"]["Enums"]["email_status"]
          step: number
          subject: string
        }
        Update: {
          body?: string
          dealer_id?: string
          id?: string
          message_id?: string | null
          scheduled_for?: string | null
          send_offset_days?: number
          sent_at?: string | null
          sequence_id?: string
          status?: Database["public"]["Enums"]["email_status"]
          step?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_emails_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_emails_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          cohort_customer_id: string | null
          customer_id: string
          dealer_id: string
          id: string
          started_at: string
          status: Database["public"]["Enums"]["sequence_status"]
          stopped_reason: string | null
          updated_at: string
        }
        Insert: {
          cohort_customer_id?: string | null
          customer_id: string
          dealer_id: string
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["sequence_status"]
          stopped_reason?: string | null
          updated_at?: string
        }
        Update: {
          cohort_customer_id?: string | null
          customer_id?: string
          dealer_id?: string
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["sequence_status"]
          stopped_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_cohort_customer_id_fkey"
            columns: ["cohort_customer_id"]
            isOneToOne: false
            referencedRelation: "cohort_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_dealer_id: { Args: never; Returns: string }
    }
    Enums: {
      customer_status: "active" | "no_longer_owns" | "unsubscribed"
      email_status: "draft" | "scheduled" | "sent" | "cancelled"
      reply_classification:
        | "replied"
        | "no_longer_owns"
        | "unsubscribe"
        | "interested"
        | "hot_lead"
      sequence_status:
        | "drafting"
        | "scheduled"
        | "active"
        | "completed"
        | "stopped"
        | "paused_rematch"
      stock_source: "scrape" | "csv" | "seed"
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
      customer_status: ["active", "no_longer_owns", "unsubscribed"],
      email_status: ["draft", "scheduled", "sent", "cancelled"],
      reply_classification: [
        "replied",
        "no_longer_owns",
        "unsubscribe",
        "interested",
        "hot_lead",
      ],
      sequence_status: [
        "drafting",
        "scheduled",
        "active",
        "completed",
        "stopped",
        "paused_rematch",
      ],
      stock_source: ["scrape", "csv", "seed"],
    },
  },
} as const
