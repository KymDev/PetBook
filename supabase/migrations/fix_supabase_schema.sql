-- SCRIPT DE CORREÇÃO PETBOOK (BACKEND/SUPABASE)
-- Data: 23/12/2025

-- 1. CORREÇÃO DE SEGURANÇA: NOTIFICAÇÕES
-- Remove a política que permite que qualquer usuário envie notificações para qualquer um
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Nova política: Usuários só podem criar notificações para seus próprios pets ou para si mesmos
CREATE POLICY "Users can create notifications for their own pets" ON public.notifications 
FOR INSERT TO authenticated 
WITH CHECK (
  (pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid())) OR
  (user_id = auth.uid())
);

-- 2. CORREÇÃO DE ESTRUTURA: CHAT HÍBRIDO
-- Adiciona coluna para identificar se o chat envolve um profissional (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_rooms' AND column_name = 'is_professional_chat') THEN
        ALTER TABLE public.chat_rooms ADD COLUMN is_professional_chat BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Ajusta a restrição de unicidade para permitir chats entre Pet e Profissional (User ID)
-- Nota: Isso assume que você quer permitir que um Pet converse com um Profissional (User ID)
-- Se o pet_2 estiver sendo usado para o User ID do profissional, precisamos remover a FK de pets para esse campo ou criar uma nova tabela.
-- Recomendação: Criar uma nova tabela de chat ou ajustar a atual para ser mais flexível.
-- Por enquanto, vamos apenas garantir que a RLS permita a visualização correta.

-- 3. CORREÇÃO DE RLS: CHAT ROOMS
-- Permite que profissionais vejam salas onde eles são o "pet_2" (usado como user_id no código atual)
DROP POLICY IF EXISTS "Participants can view chat rooms" ON public.chat_rooms;
CREATE POLICY "Participants can view chat rooms" ON public.chat_rooms 
FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.user_id = auth.uid() AND (pets.id = pet_1 OR pets.id = pet_2)) OR
  (pet_2 = auth.uid()) -- Caso o pet_2 seja o user_id do profissional
);

-- 4. CORREÇÃO DE RLS: CHAT MESSAGES
DROP POLICY IF EXISTS "Participants can view messages" ON public.chat_messages;
CREATE POLICY "Participants can view messages" ON public.chat_messages 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = room_id AND (
      EXISTS (SELECT 1 FROM public.pets p WHERE p.user_id = auth.uid() AND (p.id = cr.pet_1 OR p.id = cr.pet_2)) OR
      (cr.pet_2 = auth.uid())
    )
  )
);

-- 5. FUNÇÃO DE EXCLUSÃO DE CONTA (OPCIONAL - RECOMENDADO)
-- Esta função deve ser chamada via RPC para deletar o usuário de forma segura
-- Requer permissão de SECURITY DEFINER para deletar da tabela auth.users
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deleta os dados do usuário (o ON DELETE CASCADE nas tabelas cuidará do resto)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
