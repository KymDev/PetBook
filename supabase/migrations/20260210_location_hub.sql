-- Create missing_pets table
CREATE TABLE IF NOT EXISTS public.missing_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT,
    last_seen_location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contact_whatsapp TEXT,
    photo_url TEXT,
    is_found BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    found_at TIMESTAMPTZ
);

-- Create pet_friendly_places table
CREATE TABLE IF NOT EXISTS public.pet_friendly_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT, -- e.g., 'restaurante', 'parque', 'hotel', 'clinica'
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    rating DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.missing_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_friendly_places ENABLE ROW LEVEL SECURITY;

-- Policies for missing_pets
CREATE POLICY "Anyone can view missing pets" ON public.missing_pets
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can report missing pets" ON public.missing_pets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update missing pets" ON public.missing_pets
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for pet_friendly_places
CREATE POLICY "Anyone can view pet friendly places" ON public.pet_friendly_places
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can add places" ON public.pet_friendly_places
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create storage bucket for missing pets if it doesn't exist
-- Note: In a real Supabase environment, this would be done via UI or API, 
-- but we include it here for completeness.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('missing_pets', 'missing_pets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'missing_pets');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'missing_pets' AND auth.role() = 'authenticated');
