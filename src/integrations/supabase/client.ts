import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// No Vite, as variáveis de ambiente são acessadas via import.meta.env
// Tentamos pegar tanto o nome padrão quanto o nome alternativo que pode estar na Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Se as variáveis estiverem faltando, apenas avisamos no console em vez de travar a aplicação inteira com um Error
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Atenção: Variáveis de ambiente do Supabase não encontradas. Verifique as configurações na Vercel ou o arquivo .env");
}

// Criamos o cliente. Se as variáveis forem undefined, o Supabase lidará com isso internamente 
// ou falhará apenas quando uma requisição for feita, permitindo que o app ao menos carregue.
export const supabase = createClient<Database>(
  supabaseUrl || '', 
  supabaseAnonKey || '', 
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
