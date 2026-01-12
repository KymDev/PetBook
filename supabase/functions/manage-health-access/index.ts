import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, petId, professionalId, requestId, token, emergencyData } = await req.json()

    // Ação: Enviar Alerta de Emergência
    if (action === 'send_emergency_alert') {
      // 1. Criar notificação para o profissional
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: professionalId, // Notificar o profissional
          type: 'emergency_alert',
          message: `EMERGÊNCIA: O pet ${emergencyData.petName} está em atendimento crítico. Alergias: ${emergencyData.allergies}.`,
          related_pet_id: petId
        })

      if (notifError) throw notifError

      // 2. Conceder acesso imediato (Emergência não espera autorização)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 12)

      await supabaseAdmin
        .from('health_temporary_access')
        .insert({
          pet_id: petId,
          professional_id: professionalId,
          expires_at: expiresAt.toISOString()
        })

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ação: Validar Token e Solicitar Acesso (Chamado pelo Profissional)
    if (action === 'request_access') {
      // 1. Validar Token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('health_access_tokens')
        .select('*')
        .eq('pet_id', petId)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (tokenError || !tokenData) {
        throw new Error('Token inválido ou expirado')
      }

      // 2. Criar Solicitação de Acesso
      const { data: request, error: requestError } = await supabaseAdmin
        .from('health_access_requests')
        .insert({ pet_id: petId, professional_id: professionalId, status: 'pending' })
        .select()
        .single()

      if (requestError) throw requestError

      return new Response(JSON.stringify({ success: true, requestId: request.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ação: Aprovar Acesso (Chamado pelo Guardião)
    if (action === 'approve_access') {
      // 1. Atualizar status da solicitação
      const { data: request, error: requestError } = await supabaseAdmin
        .from('health_access_requests')
        .update({ status: 'approved' })
        .eq('id', requestId)
        .select()
        .single()

      if (requestError) throw requestError

      // 2. Conceder acesso temporário (24h)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      const { error: accessError } = await supabaseAdmin
        .from('health_temporary_access')
        .insert({
          pet_id: request.pet_id,
          professional_id: request.professional_id,
          expires_at: expiresAt.toISOString()
        })

      if (accessError) throw accessError

      // 3. Registrar histórico automático de consulta
      const { data: prof } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('id', request.professional_id)
        .single()

      await supabaseAdmin.from('health_records').insert({
        pet_id: request.pet_id,
        record_type: 'consulta',
        title: 'Consulta Iniciada via QR Code',
        record_date: new Date().toISOString().split('T')[0],
        professional_name: prof?.full_name || 'Profissional Autorizado',
        notes: 'Acesso concedido via fluxo mobile-to-mobile.'
      })

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    throw new Error('Ação inválida')
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
