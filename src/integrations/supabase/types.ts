export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
      emergency_logs: {
        Row: {
          id: string
          pet_id: string
          user_id: string
          description: string | null
          location: string | null
          contact_phone: string | null
          created_at: string
          resolved: boolean
        }
        Insert: {
          id?: string
          pet_id: string
          user_id: string
          description?: string | null
          location?: string | null
          contact_phone?: string | null
          created_at?: string
          resolved?: boolean
        }
        Update: {
          id?: string
          pet_id?: string
          user_id?: string
          description?: string | null
          location?: string | null
          contact_phone?: string | null
          created_at?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "emergency_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
      followers: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          is_user_follower: boolean
          target_pet_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          is_user_follower?: boolean
          target_pet_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          is_user_follower?: boolean
          target_pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_target_pet_id_fkey"
            columns: ["target_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      health_access_status: {
        Row: {
          id: string
          pet_id: string
          professional_user_id: string
          status: "pending" | "granted" | "revoked"
          granted_at: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          professional_user_id: string
          status?: "pending" | "granted" | "revoked"
          granted_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          professional_user_id?: string
          status?: "pending" | "granted" | "revoked"
          granted_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_access_status_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_access_status_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          observation: string | null
          pet_id: string
          professional_name: string | null
          record_date: string
          record_type: Database["public"]["Enums"]["health_record_type"]
          title: string | null
          allergies: string | null
          medications: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          observation?: string | null
          pet_id: string
          professional_name?: string | null
          record_date: string
          record_type: Database["public"]["Enums"]["health_record_type"]
          title?: string | null
          allergies?: string | null
          medications?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          observation?: string | null
          pet_id?: string
          professional_name?: string | null
          record_date?: string
          record_type?: Database["public"]["Enums"]["health_record_type"]
          title?: string | null
          allergies?: string | null
          medications?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_records_pet_id_fkey"
            columns: ["pet_id"]
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
          is_read: boolean | null
          message: string
          pet_id: string
          related_pet_id: string | null
          related_user_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          pet_id: string
          related_pet_id?: string | null
          related_user_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          pet_id?: string
          related_pet_id?: string | null
          related_user_id?: string | null
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
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_health_records: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          observation: string | null
          pet_id: string
          professional_name: string | null
          record_date: string
          record_type: Database["public"]["Enums"]["health_record_type"]
          status: string
          title: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          observation?: string | null
          pet_id: string
          professional_name?: string | null
          record_date: string
          record_type: Database["public"]["Enums"]["health_record_type"]
          status: string
          title?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          observation?: string | null
          pet_id?: string
          professional_name?: string | null
          record_date?: string
          record_type?: Database["public"]["Enums"]["health_record_type"]
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_health_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_health_records_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          type: Database["public"]["Enums"]["post_type"]
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
      reactions: {
        Row: {
          created_at: string
          id: string
          pet_id: string | null
          post_id: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id?: string | null
          post_id: string
          type: Database["public"]["Enums"]["reaction_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string | null
          post_id?: string
          type?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string | null
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
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          pet_id: string
          professional_id: string
          service_type: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          pet_id: string
          professional_id: string
          service_type: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          pet_id?: string
          professional_id?: string
          service_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          professional_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          professional_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string
          id: string
          media_url: string
          pet_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at: string
          id?: string
          media_url: string
          pet_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string
          id?: string
          media_url?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          created_at: string
          id: string
          story_id: string
          viewer_pet_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          viewer_pet_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          viewer_pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_pet_id_fkey"
            columns: ["viewer_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          full_name: string | null
          id: string
          is_professional_verified: boolean
          professional_address: string | null
          professional_bio: string | null
          professional_city: string | null
          professional_phone: string | null
          professional_price_range: string | null
          professional_service_type: Database["public"]["Enums"]["service_type"] | null
          professional_specialties: string[] | null
          professional_state: string | null
          professional_zip: string | null
          updated_at: string
          professional_whatsapp: string | null
          professional_latitude: number | null
          professional_longitude: number | null
          professional_custom_service_type: string | null
          professional_avatar_url: string | null
          professional_crmv: string | null
          professional_crmv_state: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string | null
          id: string
          is_professional_verified?: boolean
          professional_address?: string | null
          professional_bio?: string | null
          professional_city?: string | null
          professional_phone?: string | null
          professional_price_range?: string | null
          professional_service_type?: Database["public"]["Enums"]["service_type"] | null
          professional_specialties?: string[] | null
          professional_state?: string | null
          professional_zip?: string | null
          updated_at?: string
          professional_whatsapp?: string | null
          professional_latitude?: number | null
          professional_longitude?: number | null
          professional_custom_service_type?: string | null
          professional_avatar_url?: string | null
          professional_crmv?: string | null
          professional_crmv_state?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string | null
          id?: string
          is_professional_verified?: boolean
          professional_address?: string | null
          professional_city?: string | null
          professional_phone?: string | null
          professional_price_range?: string | null
          professional_service_type?: Database["public"]["Enums"]["service_type"] | null
          professional_specialties?: string[] | null
          professional_state?: string | null
          professional_zip?: string | null
          updated_at?: string
          professional_whatsapp?: string | null
          professional_latitude?: number | null
          professional_longitude?: number | null
          professional_custom_service_type?: string | null
          professional_avatar_url?: string | null
          professional_crmv?: string | null
          professional_crmv_state?: string | null
        }
        Relationships: []
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
      professional_service_view: {
        Row: {
          full_name: string | null
          id: string | null
          professional_avatar_url: string | null
          professional_bio: string | null
          professional_city: string | null
          professional_service_type: Database["public"]["Enums"]["service_type"] | null
          professional_specialties: string[] | null
          professional_state: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "user" | "professional"
      app_role: "admin" | "moderator"
      post_type: "post" | "story"
      reaction_type: "patinha" | "abraco" | "petisco"
      health_record_type: "vacina" | "consulta" | "exame" | "check_up" | "medicamento" | "cirurgia" | "alergia" | "peso" | "sintoma"
      service_type: "adestrador" | "passeador" | "veterinario" | "pet_sitter" | "groomer" | "fotografo" | "outros"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
