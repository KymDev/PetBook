-- Adicionar coluna 'resolved' se não existir
ALTER TABLE public.emergency_logs ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false;

-- Atualizar políticas se necessário (opcional, as atuais já cobrem o acesso)
