-- Create enum for reaction types
CREATE TYPE public.reaction_type AS ENUM ('patinha', 'abraco', 'petisco', 'miado', 'latido', 'fofura');

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for post types
CREATE TYPE public.post_type AS ENUM ('text', 'photo', 'video');

-- Create enum for friendship status
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');

-- Create profiles table (for user data)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create pets table
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT NOT NULL,
  age INTEGER NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  guardian_name TEXT NOT NULL,
  guardian_instagram_username TEXT NOT NULL,
  guardian_instagram_url TEXT GENERATED ALWAYS AS ('https://instagram.com/' || guardian_instagram_username) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  type post_type NOT NULL DEFAULT 'text',
  description TEXT,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create reactions table
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  type reaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (post_id, pet_id, type)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create follows table (instead of friends for simpler follow system)
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  following_pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (follower_pet_id, following_pet_id)
);

-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_1 UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  pet_2 UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (pet_1, pet_2)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create communities table
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create community_members table
CREATE TABLE public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (community_id, pet_id)
);

-- Create community_posts table
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  related_pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  related_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pets
CREATE POLICY "Anyone can view pets" ON public.pets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own pets" ON public.pets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pets" ON public.pets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pets" ON public.pets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for posts
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pet owners can create posts" ON public.posts FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));
CREATE POLICY "Pet owners can update posts" ON public.posts FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));
CREATE POLICY "Pet owners can delete posts" ON public.posts FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

-- RLS Policies for reactions
CREATE POLICY "Anyone can view reactions" ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pet owners can add reactions" ON public.reactions FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));
CREATE POLICY "Pet owners can remove reactions" ON public.reactions FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pet owners can add comments" ON public.comments FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));
CREATE POLICY "Pet owners can delete comments" ON public.comments FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pet owners can follow" ON public.follows FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = follower_pet_id AND pets.user_id = auth.uid()));
CREATE POLICY "Pet owners can unfollow" ON public.follows FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = follower_pet_id AND pets.user_id = auth.uid()));

-- RLS Policies for chat_rooms
CREATE POLICY "Participants can view chat rooms" ON public.chat_rooms FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.user_id = auth.uid() AND (pets.id = pet_1 OR pets.id = pet_2)));
CREATE POLICY "Pet owners can create chat rooms" ON public.chat_rooms FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_1 AND pets.user_id = auth.uid()));

-- RLS Policies for chat_messages
CREATE POLICY "Participants can view messages" ON public.chat_messages FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    JOIN public.pets p ON (p.id = cr.pet_1 OR p.id = cr.pet_2) 
    WHERE cr.id = room_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Senders can create messages" ON public.chat_messages FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = sender_pet_id AND pets.user_id = auth.uid()));

-- RLS Policies for communities
CREATE POLICY "Anyone can view communities" ON public.communities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage communities" ON public.communities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for community_members
CREATE POLICY "Anyone can view members" ON public.community_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pet owners can join communities" ON public.community_members FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));
CREATE POLICY "Pet owners can leave communities" ON public.community_members FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

-- RLS Policies for community_posts
CREATE POLICY "Anyone can view community posts" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can create posts" ON public.community_posts FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM public.community_members WHERE community_members.community_id = community_id AND community_members.pet_id = pet_id)
  );

-- RLS Policies for notifications
CREATE POLICY "Pet owners can view notifications" ON public.notifications FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Pet owners can update notifications" ON public.notifications FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

-- Enable realtime for chat_messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public) VALUES ('petbook-media', 'petbook-media', true);

-- Storage policies
CREATE POLICY "Anyone can view media" ON storage.objects FOR SELECT USING (bucket_id = 'petbook-media');
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'petbook-media');
CREATE POLICY "Users can update own media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'petbook-media');
CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'petbook-media');