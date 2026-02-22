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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attempt_logs: {
        Row: {
          client_request_id: string | null
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number | null
          user_id: string
        }
        Insert: {
          client_request_id?: string | null
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_index?: number | null
          user_id: string
        }
        Update: {
          client_request_id?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_logs_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_logs_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage: {
        Row: {
          created_at: string
          id: string
          question_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_leaderboard: {
        Row: {
          correct_count: number
          id: string
          month_start: string
          score: number
          total_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_count?: number
          id?: string
          month_start: string
          score?: number
          total_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_count?: number
          id?: string
          month_start?: string
          score?: number
          total_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          telegram_id: string | null
          theme_preference: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          telegram_id?: string | null
          theme_preference?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          telegram_id?: string | null
          theme_preference?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          choices: Json
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          is_active: boolean
          stem_text: string
          subtopic_id: string
        }
        Insert: {
          choices: Json
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          stem_text: string
          subtopic_id: string
        }
        Update: {
          choices?: Json
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          stem_text?: string
          subtopic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          display_order: number
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          title?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          daily_limit: number
          duration: Database["public"]["Enums"]["subscription_duration"] | null
          expires_at: string | null
          id: string
          is_active: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          duration?: Database["public"]["Enums"]["subscription_duration"] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          duration?: Database["public"]["Enums"]["subscription_duration"] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subtopics: {
        Row: {
          created_at: string
          display_order: number
          id: string
          title: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          title: string
          topic_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          display_order: number
          id: string
          subject_id: string
          title: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          subject_id: string
          title: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_state: {
        Row: {
          box_number: number
          created_at: string
          ease_factor: number
          id: string
          interval_days: number
          next_review_at: string
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          box_number?: number
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          next_review_at?: string
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          box_number?: number
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          next_review_at?: string
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_state_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_question_state_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_question_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_leaderboard: {
        Row: {
          correct_count: number
          id: string
          score: number
          total_count: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          correct_count?: number
          id?: string
          score?: number
          total_count?: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          correct_count?: number
          id?: string
          score?: number
          total_count?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      questions_safe: {
        Row: {
          choices: Json | null
          created_at: string | null
          explanation: string | null
          id: string | null
          is_active: boolean | null
          stem_text: string | null
          subtopic_id: string | null
        }
        Insert: {
          choices?: Json | null
          created_at?: string | null
          explanation?: string | null
          id?: string | null
          is_active?: boolean | null
          stem_text?: string | null
          subtopic_id?: string | null
        }
        Update: {
          choices?: Json | null
          created_at?: string | null
          explanation?: string | null
          id?: string | null
          is_active?: boolean | null
          stem_text?: string | null
          subtopic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_update_subscription: {
        Args: {
          _duration?: Database["public"]["Enums"]["subscription_duration"]
          _expires_at?: string
          _plan: Database["public"]["Enums"]["subscription_plan"]
          _user_id: string
        }
        Returns: boolean
      }
      calculate_leaderboard_score: {
        Args: { p_correct: number; p_total: number }
        Returns: number
      }
      check_answer: {
        Args: { _question_id: string; _selected_index: number }
        Returns: {
          correct_index: number
          explanation: string
          is_correct: boolean
        }[]
      }
      get_admin_users_stats: {
        Args: never
        Returns: {
          attempt_count: number
          correct_count: number
          created_at: string
          display_name: string
          id: string
          telegram_id: string
          updated_at: string
        }[]
      }
      get_admin_users_page: {
        Args: { _page?: number; _page_size?: number; _search?: string }
        Returns: {
          rows: Json
          total_count: number
        }[]
      }
      get_extended_activity: {
        Args: { _days: number }
        Returns: {
          activity_count: number
          activity_date: string
        }[]
      }
      get_frequently_wrong_questions: {
        Args: never
        Returns: {
          question_id: string
          wrong_count: number
        }[]
      }
      get_review_questions: {
        Args: { _filter_id?: string; _filter_type?: string; _limit?: number }
        Returns: {
          choices: Json
          due_count: number
          id: string
          new_count: number
          stem_text: string
          subtopic_id: string
        }[]
      }
      get_hierarchical_mastery: {
        Args: never
        Returns: {
          subject_id: string
          subject_mastery: number
          subject_name: string
          subtopic_id: string
          subtopic_mastery: number
          subtopic_name: string
          topic_id: string
          topic_mastery: number
          topic_name: string
        }[]
      }
      get_monthly_leaderboard: {
        Args: { p_month_start?: string }
        Returns: {
          accuracy: number
          avatar_url: string
          correct_count: number
          display_name: string
          rank: number
          score: number
          total_count: number
          user_id: string
        }[]
      }
      get_subject_progress: {
        Args: never
        Returns: {
          answered_count: number
          subject_name: string
          total_count: number
        }[]
      }
      get_subtopic_mastery: {
        Args: never
        Returns: {
          mastery_score: number
          subtopic_name: string
        }[]
      }
      get_user_monthly_rank: {
        Args: { p_month_start?: string }
        Returns: {
          accuracy: number
          correct_count: number
          rank: number
          score: number
          total_count: number
        }[]
      }
      get_user_profile_stats: {
        Args: never
        Returns: {
          correct_count: number
          display_name: string
          streak: number
          total_answered: number
        }[]
      }
      get_user_subscription: {
        Args: never
        Returns: {
          daily_limit: number
          expires_at: string
          is_active: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          today_usage: number
        }[]
      }
      get_user_weekly_rank: {
        Args: { p_week_start?: string }
        Returns: {
          accuracy: number
          correct_count: number
          rank: number
          score: number
          total_count: number
        }[]
      }
      get_weekly_activity: {
        Args: never
        Returns: {
          activity_count: number
          activity_date: string
        }[]
      }
      get_weekly_leaderboard: {
        Args: { p_week_start?: string }
        Returns: {
          accuracy: number
          avatar_url: string
          correct_count: number
          display_name: string
          rank: number
          score: number
          total_count: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_usage: { Args: never; Returns: boolean }
      record_answer_and_update_state: {
        Args: {
          p_client_request_id?: string
          p_is_correct: boolean
          p_question_id: string
          p_selected_index: number
        }
        Returns: {
          already_processed: boolean
          box_number: number
          ease_factor: number
          interval_days: number
          next_review_at: string
          quota_allowed: boolean
          quota_remaining: number | null
        }[]
      }
      toggle_admin_role: {
        Args: { _make_admin: boolean; _target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_duration: "monthly" | "quarterly"
      subscription_plan: "free" | "basic" | "advanced" | "smart"
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
      app_role: ["admin", "user"],
      subscription_duration: ["monthly", "quarterly"],
      subscription_plan: ["free", "basic", "advanced", "smart"],
    },
  },
} as const
