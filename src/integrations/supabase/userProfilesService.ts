import { supabase } from './client';
import { Database } from './types';

// Tipos auxiliares para facilitar o uso
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"] & {
  professional_avatar_url?: string | null;
};
export type AccountType = Database['public']['Enums']['account_type'];

/**
 * Deleta o perfil de um usuário.
 * @param userId O ID do usuário.
 * @returns Um erro, se houver.
 */
export async function deleteUserProfile(userId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  return { error };
}

/**
 * Obtém todos os perfis de usuário que são profissionais.
 * A RLS do Supabase já garante que apenas perfis com account_type = 'professional'
 * serão retornados para usuários não-admin.
 * @returns Uma lista de perfis profissionais ou um erro.
 */
export async function getAllProfessionalProfiles(): Promise<{ data: UserProfile[] | null; error: any }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('account_type', 'professional') // Filtro explícito, embora a RLS já faça isso
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar perfis profissionais:", error);
    return { data: null, error };
  }

  return { data: data as UserProfile[] | null, error: null };
}

/**
 * Obtém o perfil de um usuário específico.
 * @param userId O ID do usuário.
 * @returns O perfil do usuário ou um erro.
 */
export async function getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: any }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data: data as UserProfile | null, error };
}

/**
 * Atualiza o tipo de conta do usuário.
 * @param userId O ID do usuário.
 * @param type O novo tipo de conta ('user' ou 'professional').
 * @returns Um erro, se houver.
 */
export async function updateAccountType(userId: string, type: AccountType): Promise<{ error: any }> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ account_type: type })
    .eq('id', userId);

  return { error };
}
