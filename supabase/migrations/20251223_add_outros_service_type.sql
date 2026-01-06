-- Migration: Adicionar 'outros' ao ENUM service_type e adicionar a coluna professional_custom_service_type

-- 1. Adicionar 'outros' ao ENUM service_type
ALTER TYPE public.service_type ADD VALUE 'outros';

-- 2. Adicionar a coluna professional_custom_service_type a user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN professional_custom_service_type TEXT;

-- 3. Adicionar a coluna custom_service_type a service_providers
ALTER TABLE public.service_providers
ADD COLUMN custom_service_type TEXT;
