-- Tabela para tokens dinâmicos de QR Code
CREATE TABLE IF NOT EXISTS public.health_access_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pet_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT health_access_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT health_access_tokens_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE
);

-- Tabela para solicitações de acesso em tempo real
CREATE TABLE IF NOT EXISTS public.health_access_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pet_id uuid NOT NULL,
    professional_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT health_access_requests_pkey PRIMARY KEY (id),
    CONSTRAINT health_access_requests_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE,
    CONSTRAINT health_access_requests_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

-- Habilitar Realtime para health_access_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_access_requests;

-- Políticas de Segurança (RLS)
ALTER TABLE public.health_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_access_requests ENABLE ROW LEVEL SECURITY;

-- Guardiões podem criar e ver seus próprios tokens
CREATE POLICY "Guardians can manage their pet tokens" ON public.health_access_tokens
    FOR ALL USING (EXISTS (SELECT 1 FROM public.pets WHERE id = pet_id AND user_id = auth.uid()));

-- Profissionais podem ler tokens para validar
CREATE POLICY "Professionals can read tokens" ON public.health_access_tokens
    FOR SELECT USING (true);

-- Fluxo de solicitações
CREATE POLICY "Professionals can create access requests" ON public.health_access_requests
    FOR INSERT WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Guardians can view and update requests for their pets" ON public.health_access_requests
    FOR ALL USING (EXISTS (SELECT 1 FROM public.pets WHERE id = pet_id AND user_id = auth.uid()));

CREATE POLICY "Professionals can view their own requests" ON public.health_access_requests
    FOR SELECT USING (auth.uid() = professional_id);
