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
      chat_messages: {
        Row: {
          created_at: string
          id: string
          media_url: string | null
          message: string | null
          room_id: string
          sender_pet_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_url?: string | null
          message?: string | null
          room_id: string
          sender_pet_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_url?: string | null
          message?: string | null
          room_id?: string
          sender_pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_pet_id_fkey"
            columns: ["sender_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          pet_1: string
          pet_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_1: string
          pet_2: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_1?: string
          pet_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_pet_1_fkey"
            columns: ["pet_1"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_pet_2_fkey"
            columns: ["pet_2"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          id: string
          pet_id: string
          post_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id: string
          post_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          id: string
          pet_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          pet_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          community_id: string
          content: string | null
          created_at: string
          id: string
          media_url: string | null
          pet_id: string
        }
        Insert: {
          community_id: string
          content?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          pet_id: string
        }
        Update: {
          community_id?: string
          content?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_pet_id: string
          following_pet_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_pet_id: string
          following_pet_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_pet_id?: string
          following_pet_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_pet_id_fkey"
            columns: ["follower_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_pet_id_fkey"
            columns: ["following_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          pet_id: string
          related_pet_id: string | null
          related_post_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          pet_id: string
          related_pet_id?: string | null
          related_post_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          pet_id?: string
          related_pet_id?: string | null
          related_post_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_pet_id_fkey"
            columns: ["related_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_post_id_fkey"
            columns: ["related_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: number
          avatar_url: string | null
          bio: string | null
          breed: string
          created_at: string
          guardian_instagram_url: string | null
          guardian_instagram_username: string
          guardian_name: string
          id: string
          name: string
          species: string
          user_id: string
        }
        Insert: {
          age: number
          avatar_url?: string | null
          bio?: string | null
          breed: string
          created_at?: string
          guardian_instagram_url?: string | null
          guardian_instagram_username: string
          guardian_name: string
          id?: string
          name: string
          species: string
          user_id: string
        }
        Update: {
          age?: number
          avatar_url?: string | null
          bio?: string | null
          breed?: string
          created_at?: string
          guardian_instagram_url?: string | null
          guardian_instagram_username?: string
          guardian_name?: string
          id?: string
          name?: string
          species?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          media_url: string | null
          pet_id: string
          type: Database["public"]["Enums"]["post_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string | null
          pet_id: string
          type?: Database["public"]["Enums"]["post_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string | null
          pet_id?: string
          type?: Database["public"]["Enums"]["post_type"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          pet_id: string
          post_id: string
          type: Database["public"]["Enums"]["reaction_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id: string
          post_id: string
          type: Database["public"]["Enums"]["reaction_type"]
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string
          post_id?: string
          type?: Database["public"]["Enums"]["reaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reactions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      friendship_status: "pending" | "accepted"
      post_type: "text" | "photo" | "video"
      reaction_type:
        | "patinha"
        | "abraco"
        | "petisco"
        | "miado"
        | "latido"
        | "fofura"
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
      friendship_status: ["pending", "accepted"],
      post_type: ["text", "photo", "video"],
      reaction_type: [
        "patinha",
        "abraco",
        "petisco",
        "miado",
        "latido",
        "fofura",
      ],
    },
  },
} as const
