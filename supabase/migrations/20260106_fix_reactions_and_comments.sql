-- Migration: Fix reactions and comments tables to support professional users (user_id)
-- Date: 2026-01-06

-- 1. Fix reactions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reactions' AND column_name = 'user_id') THEN
        ALTER TABLE public.reactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Make pet_id optional since a reaction can come from a professional (user_id)
    ALTER TABLE public.reactions ALTER COLUMN pet_id DROP NOT NULL;
END
$$;

-- 2. Fix comments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'user_id') THEN
        ALTER TABLE public.comments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Make pet_id optional since a comment can come from a professional (user_id)
    ALTER TABLE public.comments ALTER COLUMN pet_id DROP NOT NULL;
END
$$;

-- 3. Update RLS Policies for reactions
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

-- 4. Update RLS Policies for comments
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
