import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const HealthQRCode: React.FC<{ petId: string }> = ({ petId }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchActiveToken();
    
    // Escutar por solicitações de acesso em tempo real
    const channel = supabase
      .channel('health_access_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_access_requests',
          filter: `pet_id=eq.${petId}`
        },
        (payload) => {
          handleAccessRequest(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [petId]);

  const fetchActiveToken = async () => {
    try {
      const { data, error } = await supabase
        .from('health_access_tokens')
        .select('token')
        .eq('pet_id', petId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setToken(data.token);
      } else {
        await generateNewToken();
      }
    } catch (err) {
      console.error("Erro ao buscar token:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateNewToken = async () => {
    setGenerating(true);
    try {
      const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token válido por 1 hora

      const { error } = await supabase
        .from('health_access_tokens')
        .insert({
          pet_id: petId,
          token: newToken,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;
      setToken(newToken);
      toast.success("Novo QR Code gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar QR Code dinâmico");
    } finally {
      setGenerating(false);
    }
  };

  const handleAccessRequest = async (request: any) => {
    if (request.status !== 'pending') return;

    // Buscar nome do profissional
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', request.professional_id)
      .single();

    const confirmed = window.confirm(`O profissional ${prof?.full_name || 'Veterinário'} deseja acessar a saúde do seu pet. Autorizar?`);
    
    if (confirmed) {
      try {
        const { error } = await supabase.functions.invoke('manage-health-access', {
          body: { action: 'approve_access', requestId: request.id }
        });
        if (error) throw error;
        toast.success("Acesso autorizado!");
      } catch (err) {
        toast.error("Erro ao autorizar acesso");
      }
    } else {
      await supabase
        .from('health_access_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);
    }
  };

  const shareUrl = `${window.location.origin}/scan-health?token=${token}&petId=${petId}`;

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 bg-white border-2 border-dashed border-blue-200 rounded-3xl shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="text-blue-600 h-5 w-5" />
        <h3 className="text-lg font-bold text-gray-800">Acesso Dinâmico Seguro</h3>
      </div>
      
      <div className="relative bg-white p-4 rounded-2xl shadow-inner border border-gray-100">
        {generating && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}
        <QRCodeSVG 
          value={shareUrl} 
          size={220}
          level={"H"}
          includeMargin={true}
        />
      </div>

      <div className="mt-6 space-y-3 w-full">
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Este código expira em 1 hora. Ao ser escaneado, você receberá uma notificação para autorizar o acesso.</p>
        </div>

        <Button 
          onClick={generateNewToken}
          disabled={generating}
          variant="outline"
          className="w-full rounded-xl gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <RefreshCw size={16} className={generating ? "animate-spin" : ""} />
          Atualizar QR Code
        </Button>
      </div>
    </div>
  );
};
