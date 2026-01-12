-- 1. Limpeza de duplicatas mantendo a integridade referencial
-- Este bloco remove registros duplicados por nome, mantendo apenas o ID mais antigo que pode estar sendo referenciado.

-- Para Vacinas
DELETE FROM public.health_standards_vaccines a
USING public.health_standards_vaccines b
WHERE a.id > b.id 
  AND a.name = b.name;

-- Para Exames
DELETE FROM public.health_standards_exams a
USING public.health_standards_exams b
WHERE a.id > b.id 
  AND a.name = b.name;

-- 2. Inserir novos procedimentos específicos (Odontologia e Oftalmologia)
-- Usamos ON CONFLICT para evitar novas duplicações se o script for rodado novamente.

-- Adicionar novos exames/procedimentos
INSERT INTO public.health_standards_exams (name, category)
VALUES 
('Tartarectomia (Limpeza de Tártaro)', 'outros'),
('Avaliação Odontológica Completa', 'outros'),
('Extração Dentária', 'outros'),
('Avaliação Oftalmológica (Teste de Schirmer/Fluoresceína)', 'outros'),
('Mensuração de Pressão Intraocular', 'outros'),
('Cirurgia de Catarata', 'outros')
ON CONFLICT (name) DO NOTHING;

-- 3. Garantir que as vacinas essenciais existam sem duplicar
INSERT INTO public.health_standards_vaccines (name, species, description)
VALUES 
('V8 (Polivalente)', ARRAY['dog'], 'Protege contra Cinomose, Parvovirose, Coronavirose, Adenovirose, Parainfluenza e Leptospirose (2 cepas).'),
('V10 (Polivalente)', ARRAY['dog'], 'Protege contra as mesmas doenças da V8, com proteção adicional contra mais 2 cepas de Leptospirose.'),
('Antirrábica', ARRAY['dog', 'cat'], 'Vacina obrigatória contra a Raiva.'),
('Gripe Canina (Tosse dos Canis)', ARRAY['dog'], 'Protege contra a Traqueobronquite Infecciosa Canina.'),
('Giárdia', ARRAY['dog'], 'Auxilia na prevenção da giardíase.'),
('Leishmaniose', ARRAY['dog'], 'Protege contra a Leishmaniose Visceral Canina.'),
('V3 (Tríplice Felina)', ARRAY['cat'], 'Protege contra Panleucopenia, Calicivirose e Rinotraqueíte.'),
('V4 (Quádrupla Felina)', ARRAY['cat'], 'Protege contra as mesmas da V3 + Clamidiose.'),
('V5 (Quíntupla Felina)', ARRAY['cat'], 'Protege contra as mesmas da V4 + Leucemia Felina (FeLV).')
ON CONFLICT (name) DO NOTHING;
