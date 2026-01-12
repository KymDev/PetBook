# Arquitetura do Sistema de QR Code Dinâmico - PetBook

Este documento descreve a implementação técnica do fluxo mobile-to-mobile para o PetBook.

## 1. Estrutura de Dados (Supabase)

### Novas Tabelas / Modificações
- **`health_access_tokens`**: Armazena tokens dinâmicos gerados pelo guardião.
  - `id`: uuid (PK)
  - `pet_id`: uuid (FK pets)
  - `token`: text (criptografado/hash)
  - `expires_at`: timestamp
  - `created_at`: timestamp
- **`health_access_requests`**: Gerencia o fluxo de autorização em tempo real.
  - `id`: uuid (PK)
  - `pet_id`: uuid (FK pets)
  - `professional_id`: uuid (FK user_profiles)
  - `status`: enum ('pending', 'approved', 'rejected')
  - `created_at`: timestamp

## 2. Fluxo Mobile-to-Mobile

### Passo 1: Geração (Guardião)
O app gera um QR Code contendo um link com um token dinâmico:
`https://petbook.app/scan-health?token=XYZ&petId=ABC`

### Passo 2: Leitura (Profissional)
O profissional escaneia o código. O app identifica o perfil do profissional e:
1. Verifica a validade do token.
2. Cria um registro em `health_access_requests` com status `pending`.
3. Notifica o guardião via Push/Realtime.

### Passo 3: Autorização (Guardião)
O guardião recebe a notificação e clica em "Autorizar".
O sistema atualiza `health_access_requests` para `approved` e concede acesso temporário em `health_temporary_access`.

### Passo 4: Acesso (Profissional)
O app do profissional detecta a mudança de status (via Supabase Realtime) e abre o prontuário instantaneamente.

## 3. Diferenciais Técnicos

### Ficha de Emergência Offline
- Utilização de **Service Workers** e **IndexedDB** para cachear informações críticas (alergias, contatos).
- Página de "Emergência" simplificada acessível via QR Code mesmo sem autorização total (apenas dados públicos).

### Histórico Automático
- Ao aprovar o acesso, o sistema cria automaticamente um registro de "Consulta Iniciada" com a localização (se disponível) e o nome do profissional.

### Cartão de Vacina Digital
- Visualização otimizada para dispositivos móveis com selo de verificação de autenticidade.
