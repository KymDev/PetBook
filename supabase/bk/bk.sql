-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  sender_pet_id uuid NOT NULL,
  message text,
  media_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id),
  CONSTRAINT chat_messages_sender_pet_id_fkey FOREIGN KEY (sender_pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.chat_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_1 uuid NOT NULL,
  pet_2 uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  professional_user_id uuid,
  chat_type text NOT NULL DEFAULT 'pet_pet'::text CHECK (chat_type = ANY (ARRAY['pet_pet'::text, 'pet_professional'::text])),
  CONSTRAINT chat_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT chat_rooms_pet_1_fkey FOREIGN KEY (pet_1) REFERENCES public.pets(id),
  CONSTRAINT chat_rooms_pet_2_fkey FOREIGN KEY (pet_2) REFERENCES public.pets(id),
  CONSTRAINT chat_rooms_professional_user_id_fkey FOREIGN KEY (professional_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  pet_id uuid,
  text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT comments_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  cover_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT communities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.community_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT community_members_pkey PRIMARY KEY (id),
  CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id),
  CONSTRAINT community_members_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  content text,
  media_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_pkey PRIMARY KEY (id),
  CONSTRAINT community_posts_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id),
  CONSTRAINT community_posts_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.emergency_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  description text NOT NULL,
  location text,
  contact_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved boolean DEFAULT false,
  CONSTRAINT emergency_logs_pkey PRIMARY KEY (id),
  CONSTRAINT emergency_logs_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT emergency_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.followers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  target_pet_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_user_follower boolean NOT NULL DEFAULT false CHECK (is_user_follower = true OR is_user_follower = false),
  CONSTRAINT followers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.health_access_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT health_access_requests_pkey PRIMARY KEY (id),
  CONSTRAINT health_access_requests_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT health_access_requests_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.health_access_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  professional_user_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'granted'::text, 'revoked'::text])),
  granted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT health_access_status_pkey PRIMARY KEY (id),
  CONSTRAINT health_access_status_professional_user_id_fkey FOREIGN KEY (professional_user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT health_access_status_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.health_access_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT health_access_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT health_access_tokens_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.health_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  record_type USER-DEFINED NOT NULL,
  title text NOT NULL,
  record_date date NOT NULL,
  notes text,
  attachment_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  vaccine_id uuid,
  exam_id uuid,
  version integer DEFAULT 1,
  is_annulled boolean DEFAULT false,
  annulled_reason text,
  weight text,
  professional_name text,
  allergies text,
  medications text,
  energy_level text DEFAULT 'normal'::text,
  appetite_level text DEFAULT 'normal'::text,
  professional_id uuid,
  CONSTRAINT health_records_pkey PRIMARY KEY (id),
  CONSTRAINT health_records_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT health_records_vaccine_id_fkey FOREIGN KEY (vaccine_id) REFERENCES public.health_standards_vaccines(id),
  CONSTRAINT health_records_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.health_standards_exams(id),
  CONSTRAINT health_records_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES auth.users(id)
);
CREATE TABLE public.health_records_history (
  history_id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  changed_by uuid,
  old_data jsonb,
  new_data jsonb,
  operation_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT health_records_history_pkey PRIMARY KEY (history_id),
  CONSTRAINT health_records_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.health_standards_exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT health_standards_exams_pkey PRIMARY KEY (id)
);
CREATE TABLE public.health_standards_vaccines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  species ARRAY NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT health_standards_vaccines_pkey PRIMARY KEY (id)
);
CREATE TABLE public.health_temporary_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT health_temporary_access_pkey PRIMARY KEY (id),
  CONSTRAINT health_temporary_access_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT health_temporary_access_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  related_pet_id uuid,
  related_post_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  related_user_id uuid,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT notifications_related_pet_id_fkey FOREIGN KEY (related_pet_id) REFERENCES public.pets(id),
  CONSTRAINT notifications_related_post_id_fkey FOREIGN KEY (related_post_id) REFERENCES public.posts(id),
  CONSTRAINT notifications_related_user_id_fkey FOREIGN KEY (related_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.pending_health_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  professional_user_id uuid NOT NULL,
  record_type USER-DEFINED NOT NULL,
  professional_name text,
  record_date date NOT NULL,
  observation text,
  attachment_url text,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text,
  CONSTRAINT pending_health_records_pkey PRIMARY KEY (id),
  CONSTRAINT pending_health_records_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT pending_health_records_professional_user_id_fkey FOREIGN KEY (professional_user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.pet_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  badge_type USER-DEFINED NOT NULL,
  awarded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pet_badges_pkey PRIMARY KEY (id),
  CONSTRAINT pet_badges_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.pets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  species text NOT NULL,
  breed text NOT NULL,
  age integer NOT NULL,
  bio text,
  avatar_url text,
  guardian_name text NOT NULL,
  guardian_instagram_username text NOT NULL,
  guardian_instagram_url text DEFAULT ('https://instagram.com/'::text || guardian_instagram_username),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pets_pkey PRIMARY KEY (id),
  CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'text'::post_type,
  description text,
  media_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  pet_id uuid,
  type USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  CONSTRAINT reactions_pkey PRIMARY KEY (id),
  CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT reactions_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.service_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_type USER-DEFINED NOT NULL,
  description text,
  phone text,
  email text,
  address text,
  latitude real,
  longitude real,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  service_type text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'completed'::text, 'cancelled'::text])),
  scheduled_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_requests_pkey PRIMARY KEY (id),
  CONSTRAINT service_requests_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT service_requests_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.service_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL UNIQUE,
  professional_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT service_reviews_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id),
  CONSTRAINT service_reviews_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.user_profiles(id),
  CONSTRAINT service_reviews_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.stories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  media_url text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT stories_pkey PRIMARY KEY (id),
  CONSTRAINT stories_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.story_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  viewer_pet_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT story_views_pkey PRIMARY KEY (id),
  CONSTRAINT story_views_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id),
  CONSTRAINT story_views_viewer_pet_id_fkey FOREIGN KEY (viewer_pet_id) REFERENCES public.pets(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  account_type USER-DEFINED NOT NULL DEFAULT 'user'::account_type,
  is_professional_verified boolean NOT NULL DEFAULT false,
  professional_bio text,
  professional_specialties ARRAY,
  professional_phone text,
  professional_address text,
  professional_service_type USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  professional_city text,
  professional_state character varying CHECK (professional_state IS NULL OR length(professional_state::text) = 2),
  professional_zip character varying,
  professional_price_range text,
  professional_whatsapp text,
  full_name text,
  professional_latitude double precision,
  professional_longitude double precision,
  professional_custom_service_type text,
  professional_avatar_url text,
  professional_crmv text,
  professional_crmv_state text,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'user'::app_role,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);