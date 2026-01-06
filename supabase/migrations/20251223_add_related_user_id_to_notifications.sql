-- Migration: Adicionar related_user_id à tabela de notificações

-- 1. Adicionar a coluna related_user_id a notifications
ALTER TABLE public.notifications
ADD COLUMN related_user_id UUID REFERENCES auth.users(id);

-- 2. Atualizar as políticas de RLS se necessário (assumindo que a RLS já está configurada para notificações)
-- As políticas existentes devem ser revisadas para garantir que cubram a nova coluna.
