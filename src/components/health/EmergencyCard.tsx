import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  AlertTriangle, 
  Heart, 
  ShieldAlert, 
  ChevronRight, 
  User, 
  Loader2,
  Send
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EmergencyData {
  petName: string;
  allergies: string;
  medications: string;
  bloodType?: string;
}

interface Professional {
  id: string;
  full_name: string;
  professional_phone: string;
  professional_whatsapp?: string;
}

export const EmergencyCard: React.FC<{ petId: string }> = ({ petId }) => {
  const [data, setData] = useState<EmergencyData | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [petId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Buscar dados do pet
      const { data: pet } = await supabase
        .from('pets')
        .select('name, health_records(allergies, medications, weight)')
        .eq('id', petId)
        .single();

      if (pet) {
        // Pegar o registro mais recente que tenha alergias/medicações
        const latestHealth = pet.health_records?.[0];
        setData({
          petName: pet.name,
          allergies: latestHealth?.allergies || "Nenhuma informada",
          medications: latestHealth?.medications || "Nenhuma informada",
        });
      }

      // 2. Buscar veterinários que já atenderam este pet (do histórico de saúde)
      const { data: records } = await supabase
        .from('health_records')
        .select('professional_id')
        .eq('pet_id', petId)
        .not('professional_id', 'is', null);

      if (records && records.length > 0) {
        const profIds = [...new Set(records.map(r => r.professional_id))];
        const { data: profs } = await supabase
          .from('user_profiles')
          .select('id, full_name, professional_phone, professional_whatsapp')
          .in('id', profIds);
        
        if (profs) setProfessionals(profs as Professional[]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de emergência:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyAction = async (prof: Professional) => {
    setSending(prof.id);
    try {
      // 1. Enviar ficha de emergência via Edge Function (Notificação/Email/Database)
      const { error } = await supabase.functions.invoke('manage-health-access', {
        body: { 
          action: 'send_emergency_alert', 
          petId, 
          professionalId: prof.id,
          emergencyData: data
        }
      });

      if (error) throw error;

      toast.success(`Ficha enviada para ${prof.full_name}!`);

      // 2. Iniciar ligação
      const phoneNumber = prof.professional_phone || prof.professional_whatsapp;
      if (phoneNumber) {
        window.location.href = `tel:${phoneNumber.replace(/\D/g, '')}`;
      }
    } catch (err) {
      toast.error("Erro ao enviar alerta de emergência");
    } finally {
      setSending(null);
    }
  };

  if (loading) return <div className="h-32 flex items-center justify-center"><Loader2 className="animate-spin text-red-500" /></div>;
  if (!data) return null;

  return (
    <Card className="border-2 border-red-100 bg-red-50/30 overflow-hidden rounded-3xl shadow-sm">
      <div className="bg-red-600 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 animate-pulse" />
          <h3 className="font-bold text-lg uppercase tracking-wider">Ficha de Emergência</h3>
        </div>
      </div>
      
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-red-100 shadow-sm">
            <AlertTriangle className="text-red-600 shrink-0" size={20} />
            <div>
              <p className="text-[10px] font-black text-red-800/50 uppercase">Alergias Críticas</p>
              <p className="text-sm text-gray-700 font-medium">{data.allergies}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-blue-100 shadow-sm">
            <Heart className="text-blue-600 shrink-0" size={20} />
            <div>
              <p className="text-[10px] font-black text-blue-800/50 uppercase">Medicações Contínuas</p>
              <p className="text-sm text-gray-700 font-medium">{data.medications}</p>
            </div>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full py-7 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-200 gap-3">
              <Phone size={24} />
              ACIONAR EMERGÊNCIA
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl max-w-[90%] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <User className="text-red-600" />
                Escolha o Veterinário
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {professionals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum veterinário encontrado no histórico deste pet.
                </p>
              ) : (
                professionals.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => handleEmergencyAction(prof)}
                    disabled={!!sending}
                    className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-red-50 rounded-2xl border border-transparent hover:border-red-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border shadow-sm">
                        <User size={20} className="text-gray-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{prof.full_name}</p>
                        <p className="text-xs text-muted-foreground">{prof.professional_phone}</p>
                      </div>
                    </div>
                    {sending === prof.id ? (
                      <Loader2 className="animate-spin text-red-600" size={20} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send size={16} className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ChevronRight size={20} className="text-gray-300 group-hover:text-red-600" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-4">
              Ao selecionar, a ficha de emergência será enviada automaticamente e a ligação será iniciada.
            </p>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
