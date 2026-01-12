import { supabase } from './client';
import { Database } from './types';

// Tipos auxiliares para facilitar o uso
type HealthRecord = Database['public']['Tables']['health_records']['Row'];
type HealthRecordType = Database['public']['Enums']['health_record_type'];
type HealthRecordInsert = Database['public']['Tables']['health_records']['Insert'];
type HealthRecordUpdate = Database['public']['Tables']['health_records']['Update'];

type HealthAccessStatus = Database['public']['Tables']['health_access_status']['Row'];
type HealthAccessStatusInsert = Database['public']['Tables']['health_access_status']['Insert'];
type HealthAccessStatusUpdate = Database['public']['Tables']['health_access_status']['Update'];

type PendingHealthRecord = Database['public']['Tables']['pending_health_records']['Row'];
type PendingHealthRecordInsert = Database['public']['Tables']['pending_health_records']['Insert'];
type PendingHealthRecordUpdate = Database['public']['Tables']['pending_health_records']['Update'];

/**
 * Obtém todos os registros de saúde de um pet específico.
 * @param petId O ID do pet.
 * @returns Uma lista de registros de saúde ou um erro.
 */
export async function getHealthRecords(petId: string): Promise<{ data: HealthRecord[] | null; error: any }> {
  const { data, error } = await supabase
    .from('health_records')
    .select('*, pet:pet_id(name)')
    .eq('pet_id', petId)
    .order('record_date', { ascending: false, nullsFirst: false }); // Ordenar por data mais nova primeiro

  return { data, error };
}

/**
 * Cria um novo registro de saúde.
 * @param recordData Os dados do novo registro.
 * @returns O registro criado ou um erro.
 */
export async function createHealthRecord(recordData: HealthRecordInsert): Promise<{ data: HealthRecord | null; error: any }> {
  // Buscar informações do usuário atual para ver se é profissional
  const { data: { user } } = await supabase.auth.getUser();
  let finalData = { ...recordData };

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, professional_crmv, professional_crmv_state, account_type')
      .eq('id', user.id)
      .single();

    if (profile?.account_type === 'professional') {
      finalData.professional_name = profile.full_name;
      // Se tiver CRMV, anexa ao nome ou em um campo específico se existir
      if (profile.professional_crmv) {
        const crmvInfo = ` (CRMV-${profile.professional_crmv_state} ${profile.professional_crmv})`;
        if (!finalData.professional_name.includes(crmvInfo)) {
          finalData.professional_name += crmvInfo;
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('health_records')
    .insert(finalData)
    .select()
    .single();

  return { data, error };
}

// --- Funções de Controle de Acesso ---

/**
 * Solicita acesso aos registros de saúde de um pet.
 * @param petId O ID do pet.
 * @param professionalUserId O ID do usuário profissional.
 * @returns O status de acesso criado ou um erro.
 */
export async function requestHealthAccess(petId: string, professionalUserId: string): Promise<{ data: HealthAccessStatus | null; error: any }> {
  const { data, error } = await supabase
    .from('health_access_status')
    .insert({ pet_id: petId, professional_user_id: professionalUserId, status: 'pending' })
    .select()
    .single();

  if (!error && data) {
    // Buscar informações do profissional para a notificação
    const { data: profData } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', professionalUserId)
      .single();

    // Buscar informações do pet
    const { data: petData } = await supabase
      .from('pets')
      .select('name')
      .eq('id', petId)
      .single();

    // Criar notificação para o guardião do pet
    await supabase.from('notifications').insert({
      pet_id: petId,
      type: 'health_access_request',
      message: `${profData?.full_name || 'Um profissional'} solicitou acesso à ficha de saúde de ${petData?.name || 'seu pet'}.`,
      related_user_id: professionalUserId,
      is_read: false
    });
  }

  return { data, error };
}

/**
 * Obtém o status de acesso de um profissional a um pet.
 * @param petId O ID do pet.
 * @param professionalUserId O ID do usuário profissional.
 * @returns O status de acesso ou um erro.
 */
export async function getHealthAccessStatus(petId: string, professionalUserId: string): Promise<{ data: HealthAccessStatus | null; error: any }> {
  const { data, error } = await supabase
    .from('health_access_status')
    .select('*')
    .eq('pet_id', petId)
    .eq('professional_user_id', professionalUserId)
    .single();

  return { data, error };
}

/**
 * Obtém todas as solicitações de acesso pendentes para os pets do guardião.
 * @param guardianUserId O ID do usuário guardião.
 * @returns Uma lista de solicitações pendentes ou um erro.
 */
export async function getPendingHealthAccessRequests(userId: string): Promise<{ data: HealthAccessStatus[] | null; error: any }> {
  // Primeiro, buscamos os IDs dos pets que pertencem a este usuário
  const { data: userPets } = await supabase
    .from('pets')
    .select('id')
    .eq('user_id', userId);

  const petIds = userPets?.map(p => p.id) || [];

  const { data, error } = await supabase
    .from('health_access_status')
    .select('*, pet:pet_id(*), professional:professional_user_id(full_name, professional_service_type)')
    .eq('status', 'pending')
    .in('pet_id', petIds);

  return { data, error };
}

/**
 * Atualiza o status de acesso (aprovar/rejeitar).
 * @param accessId O ID do registro de acesso.
 * @param status O novo status ('granted' ou 'revoked').
 * @returns O registro atualizado ou um erro.
 */
export async function updateHealthAccessStatus(accessId: string, status: 'granted' | 'revoked'): Promise<{ data: HealthAccessStatus | null; error: any }> {
  const updateData: HealthAccessStatusUpdate = { status };
  if (status === 'granted') {
    updateData.granted_at = new Date().toISOString();
    updateData.revoked_at = null;
  } else if (status === 'revoked') {
    updateData.revoked_at = new Date().toISOString();
    updateData.granted_at = null;
  }

  const { data, error } = await supabase
    .from('health_access_status')
    .update(updateData)
    .eq('id', accessId)
    .select('*, pet:pet_id(name)')
    .single();

  if (!error && data && status === 'granted') {
    // Criar notificação para o profissional informando que o acesso foi concedido
    await supabase.from('notifications').insert({
      pet_id: data.pet_id,
      type: 'health_access_granted',
      message: `Seu acesso à ficha de saúde de ${data.pet?.name || 'um pet'} foi concedido!`,
      related_user_id: data.professional_user_id,
      is_read: false
    });
  }

  return { data, error };
}

// --- Funções de Registros Pendentes ---

/**
 * Cria um novo registro de saúde pendente (submissão de profissional).
 * @param recordData Os dados do novo registro pendente.
 * @returns O registro criado ou um erro.
 */
export async function createPendingHealthRecord(recordData: PendingHealthRecordInsert): Promise<{ data: PendingHealthRecord | null; error: any }> {
  const { data, error } = await supabase
    .from('pending_health_records')
    .insert({ ...recordData, status: 'pending' })
    .select()
    .single();

  return { data, error };
}

/**
 * Obtém todos os registros de saúde pendentes para os pets do guardião.
 * @param guardianUserId O ID do usuário guardião.
 * @returns Uma lista de registros pendentes ou um erro.
 */
export async function getPendingHealthRecords(userId: string): Promise<{ data: PendingHealthRecord[] | null; error: any }> {
  // Primeiro, buscamos os IDs dos pets que pertencem a este usuário
  const { data: userPets } = await supabase
    .from('pets')
    .select('id')
    .eq('user_id', userId);

  const petIds = userPets?.map(p => p.id) || [];

  // Agora buscamos os registros pendentes para esses pets OU submetidos por este usuário (se for profissional)
  const { data, error } = await supabase
    .from('pending_health_records')
    .select('*, pet:pet_id(*), professional:professional_user_id(full_name, professional_service_type)')
    .or(`pet_id.in.(${petIds.join(',')}),professional_user_id.eq.${userId}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Atualiza o status de um registro pendente (aprovar/rejeitar).
 * @param recordId O ID do registro pendente.
 * @param status O novo status ('approved' ou 'rejected').
 * @returns O registro atualizado ou um erro.
 */
export async function updatePendingHealthRecordStatus(recordId: string, status: 'approved' | 'rejected'): Promise<{ data: PendingHealthRecord | null; error: any }> {
  const { data, error } = await supabase
    .from('pending_health_records')
    .update({ status })
    .eq('id', recordId)
    .select()
    .single();

  return { data, error };
}

/**
 * Atualiza um registro de saúde existente.
 * @param recordId O ID do registro a ser atualizado.
 * @param recordData Os dados a serem atualizados.
 * @returns O registro atualizado ou um erro.
 */
export async function updateHealthRecord(recordId: string, recordData: HealthRecordUpdate): Promise<{ data: HealthRecord | null; error: any }> {
  const { data, error } = await supabase
    .from('health_records')
    .update(recordData)
    .eq('id', recordId)
    .select()
    .single();

  return { data, error };
}

/**
 * Deleta um registro de saúde.
 * @param recordId O ID do registro a ser deletado.
 * @returns Um erro, se houver.
 */
export async function deleteHealthRecord(recordId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('health_records')
    .delete()
    .eq('id', recordId);

  return { error };
}
