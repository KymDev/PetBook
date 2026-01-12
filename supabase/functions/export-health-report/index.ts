import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // 1. Lidar com CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // 2. Inicializar Clientes Supabase
    // Cliente com a chave do usuário para verificar permissões (RLS)
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Cliente com Service Role para buscar dados que o RLS pode restringir na função
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Obter dados da requisição
    const { petId, format = 'html' } = await req.json()
    if (!petId) throw new Error('petId é obrigatório')

    // 4. Validar se o usuário tem acesso ao Pet (Segurança)
    // Buscamos o usuário através do token enviado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Não autorizado')

    // Verificar se o usuário é o dono do pet ou tem acesso concedido
    const { data: petAccess, error: accessError } = await supabaseClient
      .from('pets')
      .select('id, name, user_id')
      .eq('id', petId)
      .single()

    if (accessError || !petAccess) {
      throw new Error('Você não tem permissão para acessar os dados deste pet.')
    }

    // 5. Buscar dados completos usando o Admin Client (para garantir que pegamos tudo para o relatório)
    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .select(`
        *,
        health_records(
          *,
          health_standards_vaccines(name),
          health_standards_exams(name)
        )
      `)
      .eq('id', petId)
      .single()

    if (petError || !pet) throw new Error('Erro ao recuperar dados do pet')

    // Ordenar registros
    const sortedRecords = pet.health_records?.sort((a: any, b: any) => 
      new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
    ) || []

    // 6. Gerar HTML
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Prontuário - ${pet.name}</title>
        <style>
          body { font-family: sans-serif; color: #334155; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .pet-info { background: #f8fafc; padding: 20px; border-radius: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; }
          .record { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 15px; page-break-inside: avoid; }
          .record-header { display: flex; justify-content: space-between; font-weight: bold; color: #3b82f6; margin-bottom: 10px; }
          .record-type { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PetBook - Prontuário Médico</h1>
          <p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        <div class="pet-info">
          <div><strong>Nome:</strong> ${pet.name}</div>
          <div><strong>Espécie/Raça:</strong> ${pet.species} / ${pet.breed || 'N/A'}</div>
          <div><strong>Idade:</strong> ${pet.age} anos</div>
          <div><strong>Guardião:</strong> ${pet.guardian_name}</div>
        </div>
        <h2>Histórico de Saúde</h2>
        ${sortedRecords.length === 0 ? '<p>Nenhum registro encontrado.</p>' : sortedRecords.map((r: any) => `
          <div class="record">
            <div class="record-header">
              <span>${new Date(r.record_date).toLocaleDateString('pt-BR')}</span>
              <span class="record-type">${r.record_type}</span>
            </div>
            <strong>${r.health_standards_vaccines?.name || r.health_standards_exams?.name || r.title || 'Registro'}</strong>
            <p>${r.notes || r.observation || ''}</p>
            ${r.professional_name ? `<small>Profissional: ${r.professional_name}</small>` : ''}
          </div>
        `).join('')}
        <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
      </body>
      </html>
    `

    return new Response(html, { 
      headers: { ...corsHeaders, "Content-Type": "text/html" } 
    })

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
