-- 1. Garantir que a tabela de solicitações de serviço tenha os campos necessários para estatísticas
-- Já existe no schema, mas vamos garantir os índices para performance
CREATE INDEX IF NOT EXISTS idx_service_requests_professional_id ON public.service_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests(created_at);

-- 2. Criar uma view para estatísticas do profissional (opcional, mas ajuda na performance)
-- Esta view calcula o total de solicitações, pendentes, concluídas e uma estimativa de receita
-- Nota: A receita é baseada em um valor fictício ou pode ser expandida se houver campo de preço na solicitação
CREATE OR REPLACE VIEW public.professional_stats AS
SELECT 
    professional_id,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_services,
    COUNT(DISTINCT pet_id) as total_clients,
    -- Estimativa simples: concluídos * 100 (valor médio fictício)
    (COUNT(*) FILTER (WHERE status = 'completed') * 100) as estimated_revenue
FROM 
    public.service_requests
GROUP BY 
    professional_id;

-- 3. Garantir que as notificações não sejam enviadas para o próprio autor via Trigger (Nível de Banco de Dados)
-- Isso é uma camada extra de segurança além da correção no Frontend
CREATE OR REPLACE FUNCTION public.prevent_self_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o destinatário (pet_id ou related_user_id) for o mesmo que o autor (related_pet_id ou related_user_id)
    -- Nós cancelamos a inserção da notificação
    
    -- Caso 1: Destinatário Profissional é o mesmo que o Autor Profissional
    IF NEW.related_user_id IS NOT NULL AND NEW.related_user_id = (SELECT user_id FROM public.pets WHERE id = NEW.related_pet_id) THEN
        RETURN NULL;
    END IF;

    -- Caso 2: Destinatário Pet pertence ao mesmo usuário que o Autor Profissional
    IF NEW.pet_id IS NOT NULL AND (SELECT user_id FROM public.pets WHERE id = NEW.pet_id) = NEW.related_user_id THEN
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger na tabela de notificações
DROP TRIGGER IF EXISTS tr_prevent_self_notification ON public.notifications;
CREATE TRIGGER tr_prevent_self_notification
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_notification();

-- 4. Inserir alguns dados de exemplo para teste (opcional, remova se não quiser dados fictícios)
-- Estes dados ajudam a ver o dashboard funcionando imediatamente
/*
INSERT INTO public.service_requests (pet_id, professional_id, service_type, message, status, created_at)
SELECT 
    p.id, 
    'ID_DO_PROFISSIONAL_AQUI', 
    'Consulta', 
    'Solicitação de teste', 
    'completed', 
    now() - interval '2 days'
FROM public.pets p
LIMIT 5;
*/
