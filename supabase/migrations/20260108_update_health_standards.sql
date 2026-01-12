-- Limpar dados de exemplo anteriores (opcional, mas recomendado para consistência)
DELETE FROM public.health_standards_vaccines;
DELETE FROM public.health_standards_exams;

-- Inserir Vacinas Reais para Cães e Gatos
INSERT INTO public.health_standards_vaccines (name, species, description) VALUES 
-- Cães
('V8 (Polivalente)', ARRAY['dog'], 'Protege contra Cinomose, Parvovirose, Coronavirose, Adenovirose, Parainfluenza e Leptospirose (2 cepas).'),
('V10 (Polivalente)', ARRAY['dog'], 'Protege contra as mesmas doenças da V8, com proteção adicional contra mais 2 cepas de Leptospirose.'),
('Antirrábica', ARRAY['dog', 'cat'], 'Vacina obrigatória contra a Raiva.'),
('Gripe Canina (Tosse dos Canis)', ARRAY['dog'], 'Protege contra a Traqueobronquite Infecciosa Canina.'),
('Giárdia', ARRAY['dog'], 'Auxilia na prevenção da giardíase.'),
('Leishmaniose', ARRAY['dog'], 'Protege contra a Leishmaniose Visceral Canina.'),

-- Gatos
('V3 (Tríplice Felina)', ARRAY['cat'], 'Protege contra Panleucopenia, Calicivirose e Rinotraqueíte.'),
('V4 (Quádrupla Felina)', ARRAY['cat'], 'Protege contra as mesmas da V3 + Clamidiose.'),
('V5 (Quíntupla Felina)', ARRAY['cat'], 'Protege contra as mesmas da V4 + Leucemia Felina (FeLV).');

-- Inserir Exames Reais (Laboratoriais e Imagem)
INSERT INTO public.health_standards_exams (name, category) VALUES 
-- Laboratoriais
('Hemograma Completo', 'laboratorial'),
('Bioquímico Renal (Ureia e Creatinina)', 'laboratorial'),
('Bioquímico Hepático (ALT, AST, FA, GGT)', 'laboratorial'),
('Glicemia em Jejum', 'laboratorial'),
('Exame de Urina (Tipo I e RPCU)', 'laboratorial'),
('Exame de Fezes (Coprológico)', 'laboratorial'),
('Pesquisa de Hemoparasitas (4DX/Ehrlichia)', 'laboratorial'),
('Teste de FIV e FeLV', 'laboratorial'),
('Dosagem Hormonal (T4, Cortisol)', 'laboratorial'),
('Citologia / Biópsia', 'laboratorial'),

-- Imagem
('Ultrassonografia Abdominal', 'imagem'),
('Ecocardiograma com Doppler', 'imagem'),
('Eletrocardiograma (ECG)', 'imagem'),
('Radiografia (Raio-X) de Tórax', 'imagem'),
('Radiografia (Raio-X) Articular/Ósseo', 'imagem'),
('Tomografia Computadorizada', 'imagem'),

-- Outros
('Pressão Arterial', 'outros'),
('Avaliação Oftalmológica', 'outros'),
('Avaliação Odontológica', 'outros');
