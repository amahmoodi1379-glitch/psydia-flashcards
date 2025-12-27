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
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_index?: number | null
          user_id: string
        }
        Update: {
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
      get_subject_progress: {
        Args: { _user_id: string }
        Returns: {
          answered_count: number
          subject_name: string
          total_count: number
        }[]
      }
      get_subtopic_mastery: {
        Args: { _user_id: string }
        Returns: {
          mastery_score: number
          subtopic_name: string
        }[]
      }
      get_user_profile_stats: {
        Args: { _user_id: string }
        Returns: {
          correct_count: number
          display_name: string
          streak: number
          total_answered: number
        }[]
      }
      get_weekly_activity: {
        Args: { _user_id: string }
        Returns: {
          activity_count: number
          activity_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
