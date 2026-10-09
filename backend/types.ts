/* eslint-disable */
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
      notification_state: {
        Row: {
          last_read_at: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
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
      post_reposts: {
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
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
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
          image_url: string | null
          initial: string
          is_mine: boolean
          quote_of: string | null
          reply_to: string | null
          user_id: string | null
        }
        Insert: {
          author_name: string
          avatar_index?: number
          body: string
          created_at?: string
          handle: string
          id?: string
          image_url?: string | null
          initial: string
          is_mine?: boolean
          quote_of?: string | null
          reply_to?: string | null
          user_id?: string | null
        }
        Update: {
          author_name?: string
          avatar_index?: number
          body?: string
          created_at?: string
          handle?: string
          id?: string
          image_url?: string | null
          initial?: string
          is_mine?: boolean
          quote_of?: string | null
          reply_to?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_quote_of_fkey"
            columns: ["quote_of"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reply_to_fkey"
            columns: ["reply_to"]
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
        Args: {
          expected_user_id: string
          post_body: string
          post_id: string
          post_image_url?: string
        }
        Returns: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          image_url: string | null
          initial: string
          is_mine: boolean
          quote_of: string | null
          reply_to: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_quote_post: {
        Args: {
          expected_user_id: string
          post_body: string
          post_id: string
          post_image_url?: string
          quote_of_id: string
        }
        Returns: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          image_url: string | null
          initial: string
          is_mine: boolean
          quote_of: string | null
          reply_to: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_reply_post: {
        Args: {
          expected_user_id: string
          post_body: string
          post_id: string
          post_image_url?: string
          reply_to_id: string
        }
        Returns: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          image_url: string | null
          initial: string
          is_mine: boolean
          quote_of: string | null
          reply_to: string | null
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
        Args: { expected_user_id: string }
        Returns: {
          actor_id: string
          body: string
          created_at: string
          is_new: boolean
          kind: string
          post_id: string
          ref_post_id: string
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
      get_post_reposts: {
        Args: { post_ids: string[] }
        Returns: {
          is_reposted: boolean
          post_id: string
          repost_count: number
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
      get_visible_posts: {
        Args: { expected_user_id?: string }
        Returns: {
          author_name: string
          avatar_index: number
          body: string
          created_at: string
          handle: string
          id: string
          image_url: string | null
          initial: string
          is_mine: boolean
          quote_of: string | null
          reply_to: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
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
      mark_notifications_read: {
        Args: { expected_user_id: string }
        Returns: undefined
      }
      save_profile: {
        Args: {
          expected_user_id: string
          profile_avatar?: string
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
      set_post_repost: {
        Args: {
          expected_user_id: string
          reposted: boolean
          target_post_id: string
        }
        Returns: {
          is_reposted: boolean
          post_id: string
          repost_count: number
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
