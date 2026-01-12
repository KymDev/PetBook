CREATE TABLE public.emergency_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  user_id uuid NOT NULL, -- Quem acionou a emergência
  description text,
  location text,
  contact_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT emergency_logs_pkey PRIMARY KEY (id),
  CONSTRAINT emergency_logs_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE,
  CONSTRAINT emergency_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.emergency_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver emergências de seus pets"
  ON public.emergency_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = emergency_logs.pet_id
      AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir emergências para seus pets"
  ON public.emergency_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = emergency_logs.pet_id
      AND pets.user_id = auth.uid()
    )
  );
