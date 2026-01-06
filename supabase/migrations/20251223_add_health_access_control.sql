-- Migration: Adicionar tabelas de controle de acesso à saúde

-- 1. Tabela para armazenar o status de acesso do profissional aos registros de saúde de um pet
CREATE TABLE public.health_access_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  professional_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'granted', 'revoked')),
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE (pet_id, professional_user_id)
);

-- 2. Tabela para armazenar submissões de registros de saúde por profissionais (pendente de aprovação do guardião)
CREATE TABLE public.pending_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  professional_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  record_type public.health_record_type NOT NULL,
  professional_name TEXT,
  record_date DATE NOT NULL,
  observation TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.health_access_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_health_records ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para health_access_status
-- Permitir que profissionais solicitem acesso (insert)
CREATE POLICY "Professionals can request health access" ON public.health_access_status FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT account_type FROM public.user_profiles WHERE id = auth.uid()) = 'professional' AND
    professional_user_id = auth.uid()
  );

-- Permitir que guardiões visualizem e gerenciem o status de acesso (approve/reject)
CREATE POLICY "Pet owners can manage health access" ON public.health_access_status FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid())
  );

-- Permitir que profissionais visualizem seus próprios pedidos concedidos/pendentes
CREATE POLICY "Professionals can view their health access status" ON public.health_access_status FOR SELECT TO authenticated
  USING (professional_user_id = auth.uid());

-- 5. Políticas RLS para pending_health_records
-- Permitir que profissionais submetam registros pendentes (insert)
CREATE POLICY "Professionals can submit pending health records" ON public.pending_health_records FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT account_type FROM public.user_profiles WHERE id = auth.uid()) = 'professional' AND
    professional_user_id = auth.uid()
  );

-- Permitir que guardiões visualizem e gerenciem registros pendentes (approve/reject)
CREATE POLICY "Pet owners can manage pending health records" ON public.pending_health_records FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.user_id = auth.uid())
  );

-- 6. Atualizar RLS para health_records para permitir que profissionais com acesso concedido visualizem
CREATE POLICY "Granted professionals can view health records" ON public.health_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.health_access_status
      WHERE
        health_access_status.pet_id = health_records.pet_id AND
        health_access_status.professional_user_id = auth.uid() AND
        health_access_status.status = 'granted'
    )
  );

-- 7. Função para mover registro pendente aprovado para health_records
CREATE OR REPLACE FUNCTION public.move_approved_record()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.health_records (pet_id, record_type, professional_name, record_date, observation, attachment_url)
    VALUES (NEW.pet_id, NEW.record_type, NEW.professional_name, NEW.record_date, NEW.observation, NEW.attachment_url);
    
    -- Opcional: Deletar o registro pendente após a aprovação
    -- DELETE FROM public.pending_health_records WHERE id = NEW.id;
    -- Se não deletar, o status 'approved' servirá como histórico.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger para mover registro pendente aprovado
CREATE TRIGGER on_pending_record_approved
  AFTER UPDATE ON public.pending_health_records
  FOR EACH ROW EXECUTE FUNCTION public.move_approved_record();
