import React, { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Loader2,
  History
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface EmergencyButtonProps {
  petId: string;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({ petId }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    description: '',
    location: '',
    contact_phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('emergency_logs')
        .insert({
          pet_id: petId,
          user_id: user.id,
          description: formData.description,
          location: formData.location,
          contact_phone: formData.contact_phone
        });

      if (error) throw error;

      toast.success("Emergência registrada com sucesso!");
      setOpen(false);
      setFormData({ description: '', location: '', contact_phone: '' });
    } catch (error: any) {
      console.error("Erro ao registrar emergência:", error);
      toast.error("Erro ao registrar emergência");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('emergency_logs')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between bg-red-50 p-4 rounded-2xl border border-red-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertCircle className="text-red-600" size={20} />
          </div>
          <div>
            <h4 className="font-bold text-red-900 text-sm">Canal de Emergência</h4>
            <p className="text-[10px] text-red-700">Registre ocorrências críticas aqui</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={historyOpen} onOpenChange={(val) => {
            setHistoryOpen(val);
            if (val) fetchHistory();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-red-200 text-red-700 hover:bg-red-100 rounded-xl gap-1">
                <History size={14} />
                Histórico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="text-red-600" />
                  Histórico de Emergências
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-4 pr-2">
                {historyLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-red-600" /></div>
                ) : history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma emergência registrada.</p>
                ) : (
                  history.map((log) => (
                    <div key={log.id} className="p-4 bg-muted/30 rounded-2xl border border-red-50 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-red-600 uppercase">
                          {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{log.description}</p>
                      {log.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="font-bold">Local:</span> {log.location}
                        </p>
                      )}
                      {log.contact_phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="font-bold">Contato:</span> {log.contact_phone}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1">
                <AlertCircle size={14} />
                Acionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="text-red-600" />
                  Registrar Emergência
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="description">O que está acontecendo?</Label>
                  <Textarea 
                    id="description"
                    placeholder="Descreva brevemente a emergência..."
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localização (Opcional)</Label>
                  <Input 
                    id="location"
                    placeholder="Onde você está?"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone de Contato (Opcional)</Label>
                  <Input 
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-6 font-bold">
                    {loading ? <Loader2 className="animate-spin" /> : "CONFIRMAR REGISTRO"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};
