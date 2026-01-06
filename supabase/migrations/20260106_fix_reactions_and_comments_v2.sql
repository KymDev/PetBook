-- Migration: Fix reactions and comments tables and create Views for easier frontend consumption
-- Date: 2026-01-06

-- 1. Fix reactions table structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reactions' AND column_name = 'user_id') THEN
        ALTER TABLE public.reactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Make pet_id optional since a reaction can come from a professional (user_id)
    ALTER TABLE public.reactions ALTER COLUMN pet_id DROP NOT NULL;
END
$$;

-- 2. Fix comments table structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'user_id') THEN
        ALTER TABLE public.comments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Make pet_id optional since a comment can come from a professional (user_id)
    ALTER TABLE public.comments ALTER COLUMN pet_id DROP NOT NULL;
END
$$;

-- 3. Create View for Comments with User Profiles
-- This solves the join issue between comments -> auth.users -> user_profiles
DROP VIEW IF EXISTS public.comments_with_profiles;
CREATE VIEW public.comments_with_profiles AS
SELECT
    c.*,
    up.full_name as user_full_name,
    up.professional_avatar_url as user_avatar_url,
    up.account_type as user_account_type,
    up.is_professional_verified
FROM public.comments c
LEFT JOIN public.user_profiles up ON c.user_id = up.id;

-- 4. Create View for Reactions with User Profiles
DROP VIEW IF EXISTS public.reactions_with_profiles;
CREATE VIEW public.reactions_with_profiles AS
SELECT
    r.*,
    up.full_name as user_full_name,
    up.professional_avatar_url as user_avatar_url,
    up.account_type as user_account_type
FROM public.reactions r
LEFT JOIN public.user_profiles up ON r.user_id = up.id;

-- 5. Update RLS Policies for reactions
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.reactions;
CREATE POLICY "Anyone can view reactions" ON public.reactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can react to posts" ON public.reactions;
CREATE POLICY "Users can react to posts" ON public.reactions FOR INSERT TO authenticated WITH CHECK (
    (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid())) OR
    (user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can remove their reactions" ON public.reactions;
CREATE POLICY "Users can remove their reactions" ON public.reactions FOR DELETE TO authenticated USING (
    (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid())) OR
    (user_id = auth.uid())
);

-- 6. Update RLS Policies for comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can comment on posts" ON public.comments;
CREATE POLICY "Users can comment on posts" ON public.comments FOR INSERT TO authenticated WITH CHECK (
    (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid())) OR
    (user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their comments" ON public.comments;
CREATE POLICY "Users can delete their comments" ON public.comments FOR DELETE TO authenticated USING (
    (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid())) OR
    (user_id = auth.uid())
);

-- Grant access to views
GRANT SELECT ON public.comments_with_profiles TO authenticated;
GRANT SELECT ON public.reactions_with_profiles TO authenticated;
