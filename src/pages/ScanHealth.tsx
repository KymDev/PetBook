import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, CheckCircle2, PawPrint } from "lucide-react";
import { toast } from "sonner";

const ScanHealth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  
  const [status, setStatus] = useState<'validating' | 'requesting' | 'waiting' | 'error'>('validating');
  const [errorMsg, setErrorMsg] = useState('');
  const [petName, setPetName] = useState('');

  const token = searchParams.get('token');
  const petId = searchParams.get('petId');

  useEffect(() => {
    if (!user || !profile) return;
    if (!token || !petId) {
      setStatus('error');
      setErrorMsg('Link de acesso inválido.');
      return;
    }

    if (profile.account_type !== 'professional') {
      setStatus('error');
      setErrorMsg('Apenas profissionais podem utilizar este fluxo de acesso.');
      return;
    }

    handleScan();
  }, [user, profile, token, petId]);

  const handleScan = async () => {
    try {
      // 1. Buscar nome do pet para exibir
      const { data: pet } = await supabase.from('pets').select('name').eq('id', petId).single();
      if (pet) setPetName(pet.name);

      // 2. Solicitar acesso via Edge Function
      setStatus('requesting');
      const { data, error } = await supabase.functions.invoke('manage-health-access', {
        body: { 
          action: 'request_access', 
          petId, 
          token, 
          professionalId: user?.id 
        }
      });

      if (error) throw error;

      // 3. Aguardar aprovação via Realtime
      setStatus('waiting');
      const requestId = data.requestId;

      const channel = supabase
        .channel(`request_${requestId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'health_access_requests',
            filter: `id=eq.${requestId}`
          },
          (payload) => {
            if (payload.new.status === 'approved') {
              toast.success("Acesso autorizado!");
              navigate(`/pet/${petId}/health`);
            } else if (payload.new.status === 'rejected') {
              setStatus('error');
              setErrorMsg('O guardião recusou a solicitação de acesso.');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };

    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Erro ao processar QR Code.');
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-md py-12 px-4">
        <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white">
            <div className="bg-white/20 w-20 h-20 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-4">
              <PawPrint size={40} />
            </div>
            <h1 className="text-2xl font-bold">PetBook Health</h1>
            <p className="text-blue-100 text-sm mt-1">Aperto de Patinha Digital</p>
          </div>

          <CardContent className="p-8 text-center">
            {status === 'validating' || status === 'requesting' ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <p className="font-medium text-gray-600">Validando acesso ao prontuário de {petName || 'Pet'}...</p>
              </div>
            ) : status === 'waiting' ? (
              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping bg-blue-100 rounded-full scale-150 opacity-50"></div>
                  <CheckCircle2 className="h-16 w-16 text-blue-600 mx-auto relative z-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-gray-800">Solicitação Enviada!</h2>
                  <p className="text-gray-500">Aguardando o guardião autorizar no celular dele...</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-700">
                    Mantenha esta tela aberta. O prontuário abrirá automaticamente assim que for liberado.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-gray-800">Acesso Negado</h2>
                  <p className="text-red-600 text-sm">{errorMsg}</p>
                </div>
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-900 hover:bg-black text-white rounded-xl"
                >
                  Voltar para o Início
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ScanHealth;
