// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          post_id: string
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          post_id: string
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          post_id?: string
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_actor_id_fkey"
            columns: ["post_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "post_likes"
            referencedColumns: ["post_id", "user_id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_bookmarks: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_poll_options: {
        Row: { body: string; feedback: string | null; id: string; position: number; post_id: string; result_kind: string | null }
        Insert: { body: string; feedback?: string | null; id?: string; position: number; post_id: string; result_kind?: string | null }
        Update: { body?: string; feedback?: string | null; id?: string; position?: number; post_id?: string; result_kind?: string | null }
        Relationships: [
          { foreignKeyName: "post_poll_options_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "post_polls"; referencedColumns: ["post_id"] },
        ]
      }
      post_poll_response_options: {
        Row: { option_id: string; post_id: string; response_id: string }
        Insert: { option_id: string; post_id: string; response_id: string }
        Update: { option_id?: string; post_id?: string; response_id?: string }
        Relationships: [
          { foreignKeyName: "post_poll_response_options_option_id_post_id_fkey"; columns: ["option_id", "post_id"]; isOneToOne: false; referencedRelation: "post_poll_options"; referencedColumns: ["id", "post_id"] },
          { foreignKeyName: "post_poll_response_options_response_id_post_id_fkey"; columns: ["response_id", "post_id"]; isOneToOne: false; referencedRelation: "post_poll_responses"; referencedColumns: ["id", "post_id"] },
        ]
      }
      post_poll_responses: {
        Row: { created_at: string; id: string; post_id: string; user_id: string }
        Insert: { created_at?: string; id?: string; post_id: string; user_id: string }
        Update: { created_at?: string; id?: string; post_id?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "post_poll_responses_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "post_polls"; referencedColumns: ["post_id"] },
        ]
      }
      post_polls: {
        Row: { allows_multiple: boolean; created_at: string; explanation: string | null; kind: string; post_id: string }
        Insert: { allows_multiple?: boolean; created_at?: string; explanation?: string | null; kind: string; post_id: string }
        Update: { allows_multiple?: boolean; created_at?: string; explanation?: string | null; kind?: string; post_id?: string }
        Relationships: [
          { foreignKeyName: "post_polls_post_id_fkey"; columns: ["post_id"]; isOneToOne: true; referencedRelation: "posts"; referencedColumns: ["id"] },
        ]
      }
      posts: {
        Row: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          initial: string
          is_mine: boolean
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          author_name: string
          avatar_index?: number
          body: string
          created_at?: string
          handle: string
          id?: string
          initial: string
          is_mine?: boolean
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          author_name?: string
          avatar_index?: number
          body?: string
          created_at?: string
          handle?: string
          id?: string
          initial?: string
          is_mine?: boolean
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string | null
          email: string | null
          handle: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string | null
          email?: string | null
          handle?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string | null
          email?: string | null
          handle?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_relationships: {
        Row: {
          created_at: string
          kind: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_account: {
        Args: { author_id: string; viewer_id: string }
        Returns: boolean
      }
      create_post: {
        Args: { expected_user_id: string; post_body: string; post_id: string }
        Returns: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          initial: string
          is_mine: boolean
          parent_id: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_post_with_poll: {
        Args: {
          expected_user_id: string
          poll_allows_multiple: boolean
          poll_explanation: string
          poll_kind: string
          poll_options: Json
          post_body: string
          post_id: string
        }
        Returns: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          initial: string
          is_mine: boolean
          parent_id: string | null
          user_id: string | null
        }[]
        SetofOptions: { from: "*"; to: "posts"; isOneToOne: false; isSetofReturn: true }
      }
      create_reply: {
        Args: {
          expected_user_id: string
          reply_body: string
          reply_id: string
          target_post_id: string
        }
        Returns: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          initial: string
          is_mine: boolean
          parent_id: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_account: { Args: { expected_user_id: string }; Returns: undefined }
      ensure_profile: {
        Args: {
          expected_user_id: string
          profile_avatar: string
          profile_email: string
          profile_name: string
        }
        Returns: undefined
      }
      get_notifications: {
        Args: {
          before_created_at?: string
          before_id?: string
          expected_user_id: string
        }
        Returns: {
          actor_name: string
          created_at: string
          id: string
          is_grouped: boolean
          like_count: number
          post_body: string
          post_id: string
          read_at: string
          unread_count: number
        }[]
      }
      get_post_bookmarks: {
        Args: { expected_user_id: string }
        Returns: {
          created_at: string
          post_id: string
        }[]
      }
      get_post_likes: {
        Args: { post_ids: string[] }
        Returns: {
          is_liked: boolean
          like_count: number
          post_id: string
        }[]
      }
      get_post_polls: {
        Args: { expected_user_id?: string; requested_post_ids: string[] }
        Returns: {
          allows_multiple: boolean
          explanation: string | null
          has_responded: boolean
          options: Json
          poll_kind: string
          post_id: string
          response_count: number
        }[]
      }
      get_public_profiles: {
        Args: { profile_ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          handle: string
          id: string
          name: string
          post_count: number
        }[]
      }
      get_user_relationship: {
        Args: { expected_user_id: string; target_user_id: string }
        Returns: {
          is_blocked: boolean
          is_muted: boolean
        }[]
      }
      get_visible_posts: {
        Args: { expected_user_id?: string }
        Returns: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          initial: string
          is_mine: boolean
          parent_id: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      handle_available: {
        Args: { candidate_handle: string; expected_user_id: string }
        Returns: boolean
      }
      import_post_bookmarks: {
        Args: { expected_user_id: string; post_ids: string[] }
        Returns: {
          created_at: string
          post_id: string
        }[]
      }
      is_blocked_pair: {
        Args: { first_id: string; second_id: string }
        Returns: boolean
      }
      list_user_relationships: {
        Args: { expected_user_id: string }
        Returns: {
          kind: string
          target_handle: string
          target_id: string
          target_name: string
        }[]
      }
      mark_all_notifications_read: {
        Args: { before_time: string; expected_user_id: string }
        Returns: undefined
      }
      mark_notifications_read: {
        Args: { expected_user_id: string; notification_ids: string[] }
        Returns: undefined
      }
      mark_post_notifications_read: {
        Args: {
          before_time: string
          expected_user_id: string
          target_post_id: string
        }
        Returns: undefined
      }
      save_profile: {
        Args: {
          expected_user_id: string
          profile_avatar: string
          profile_bio: string
          profile_handle: string
          profile_name: string
        }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          handle: string
          id: string
          name: string
          post_count: number
        }[]
      }
      set_post_bookmark: {
        Args: {
          expected_user_id: string
          saved: boolean
          target_post_id: string
        }
        Returns: {
          created_at: string
          post_id: string
        }[]
      }
      set_post_like: {
        Args: {
          expected_user_id: string
          liked: boolean
          target_post_id: string
        }
        Returns: {
          is_liked: boolean
          like_count: number
          post_id: string
        }[]
      }
      submit_post_poll_response: {
        Args: { expected_user_id: string; option_ids: string[]; target_post_id: string }
        Returns: {
          allows_multiple: boolean
          explanation: string | null
          has_responded: boolean
          options: Json
          poll_kind: string
          post_id: string
          response_count: number
        }[]
      }
      set_user_relationship: {
        Args: {
          active: boolean
          expected_user_id: string
          relation_kind: string
          target_user_id: string
        }
        Returns: {
          is_blocked: boolean
          is_muted: boolean
        }[]
      }
      user_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
