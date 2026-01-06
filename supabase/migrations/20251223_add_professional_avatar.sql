-- Migration: Add professional_avatar_url to user_profiles

-- 1. Add professional_avatar_url column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN professional_avatar_url TEXT;

-- 2. Update RLS policy to allow professionals to update their avatar
-- The existing policy "Users can update own profile" on user_profiles should cover this.
