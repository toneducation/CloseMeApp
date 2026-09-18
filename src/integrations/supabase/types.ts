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
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          admin_role: Database["public"]["Enums"]["admin_role"]
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          target_resource_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          admin_role: Database["public"]["Enums"]["admin_role"]
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_resource_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          admin_role?: Database["public"]["Enums"]["admin_role"]
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_resource_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      conversation_access_log: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          match_id: string | null
          reason: string
          report_id: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          match_id?: string | null
          reason: string
          report_id?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          match_id?: string | null
          reason?: string
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_access_log_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_matches: {
        Row: {
          created_at: string
          day: string
          id: string
          opened: boolean
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          opened?: boolean
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          opened?: boolean
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      interests: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          liked_id: string
          liker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_id: string
          liker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_id?: string
          liker_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          compatibility: number
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          compatibility?: number
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          compatibility?: number
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          match_id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_id: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          duration_hours: number | null
          expires_at: string | null
          id: string
          reason: string
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          reason: string
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          reason?: string
          target_user_id?: string
        }
        Relationships: []
      }
      moderation_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          note: string
          report_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          note: string
          report_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_notes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      passes: {
        Row: {
          created_at: string
          id: string
          passed_id: string
          passer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passed_id: string
          passer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passed_id?: string
          passer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          extra_photos: string[]
          filter_city: string | null
          first_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          hidden: boolean
          id: string
          interests: string[]
          is_complete: boolean
          is_demo: boolean
          last_active_at: string
          max_age: number
          messaging_disabled: boolean
          min_age: number
          personality: Json
          photo_url: string | null
          preferred_gender: Database["public"]["Enums"]["pref_type"] | null
          referral_code: string | null
          referred_by: string | null
          report_count: number
          status: Database["public"]["Enums"]["account_status"]
          suspended_until: string | null
          telegram_id: number | null
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          extra_photos?: string[]
          filter_city?: string | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hidden?: boolean
          id: string
          interests?: string[]
          is_complete?: boolean
          is_demo?: boolean
          last_active_at?: string
          max_age?: number
          messaging_disabled?: boolean
          min_age?: number
          personality?: Json
          photo_url?: string | null
          preferred_gender?: Database["public"]["Enums"]["pref_type"] | null
          referral_code?: string | null
          referred_by?: string | null
          report_count?: number
          status?: Database["public"]["Enums"]["account_status"]
          suspended_until?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          extra_photos?: string[]
          filter_city?: string | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hidden?: boolean
          id?: string
          interests?: string[]
          is_complete?: boolean
          is_demo?: boolean
          last_active_at?: string
          max_age?: number
          messaging_disabled?: boolean
          min_age?: number
          personality?: Json
          photo_url?: string | null
          preferred_gender?: Database["public"]["Enums"]["pref_type"] | null
          referral_code?: string | null
          referred_by?: string | null
          report_count?: number
          status?: Database["public"]["Enums"]["account_status"]
          suspended_until?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["report_category"]
          created_at: string
          description: string | null
          id: string
          match_id: string | null
          priority: number
          reported_id: string
          reporter_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string | null
          id?: string
          match_id?: string | null
          priority?: number
          reported_id: string
          reporter_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string | null
          id?: string
          match_id?: string | null
          priority?: number
          reported_id?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          current_streak: number
          last_active_day: string | null
          longest_streak: number
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_active_day?: string | null
          longest_streak?: number
          user_id: string
        }
        Update: {
          current_streak?: number
          last_active_day?: string | null
          longest_streak?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          age: number | null
          bio: string | null
          city: string | null
          created_at: string | null
          extra_photos: string[] | null
          first_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string | null
          interests: string[] | null
          is_demo: boolean | null
          max_age: number | null
          min_age: number | null
          personality: Json | null
          photo_url: string | null
          preferred_gender: Database["public"]["Enums"]["pref_type"] | null
        }
        Insert: {
          age?: never
          bio?: string | null
          city?: string | null
          created_at?: string | null
          extra_photos?: string[] | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string | null
          interests?: string[] | null
          is_demo?: boolean | null
          max_age?: number | null
          min_age?: number | null
          personality?: Json | null
          photo_url?: string | null
          preferred_gender?: Database["public"]["Enums"]["pref_type"] | null
        }
        Update: {
          age?: never
          bio?: string | null
          city?: string | null
          created_at?: string | null
          extra_photos?: string[] | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string | null
          interests?: string[] | null
          is_demo?: boolean | null
          max_age?: number | null
          min_age?: number | null
          personality?: Json | null
          photo_url?: string | null
          preferred_gender?: Database["public"]["Enums"]["pref_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_role_of: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      has_admin_role: {
        Args: {
          _role: Database["public"]["Enums"]["admin_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_pair: { Args: { _a: string; _b: string }; Returns: boolean }
      is_match_member: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned" | "deleted"
      admin_role: "SUPER_ADMIN" | "MODERATOR" | "SUPPORT"
      gender_type: "man" | "woman" | "nonbinary" | "unspecified"
      pref_type: "men" | "women" | "everyone"
      report_category:
        | "spam"
        | "fake_profile"
        | "harassment"
        | "inappropriate"
        | "underage"
        | "scam"
        | "threat"
        | "other"
      report_status:
        | "NEW"
        | "UNDER_REVIEW"
        | "RESOLVED"
        | "DISMISSED"
        | "ESCALATED"
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
      account_status: ["active", "suspended", "banned", "deleted"],
      admin_role: ["SUPER_ADMIN", "MODERATOR", "SUPPORT"],
      gender_type: ["man", "woman", "nonbinary", "unspecified"],
      pref_type: ["men", "women", "everyone"],
      report_category: [
        "spam",
        "fake_profile",
        "harassment",
        "inappropriate",
        "underage",
        "scam",
        "threat",
        "other",
      ],
      report_status: [
        "NEW",
        "UNDER_REVIEW",
        "RESOLVED",
        "DISMISSED",
        "ESCALATED",
      ],
    },
  },
} as const
