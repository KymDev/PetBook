import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Loader2,
  History,
  CheckCircle2,
  AlertTriangle
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
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface EmergencyButtonProps {
  petId: string;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({ petId }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    description: '',
    location: '',
    contact_phone: ''
  });

  useEffect(() => {
    fetchActiveEmergency();
  }, [petId]);

  const fetchActiveEmergency = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_logs')
        .select('*')
        .eq('pet_id', petId)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveEmergency(data);
    } catch (error) {
      console.error("Erro ao buscar emergência ativa:", error);
    }
  };

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
          contact_phone: formData.contact_phone,
          resolved: false
        });

      if (error) throw error;

      toast.success(t("health.emergency.success"));
      setOpen(false);
      setFormData({ description: '', location: '', contact_phone: '' });
      fetchActiveEmergency();
    } catch (error: any) {
      console.error("Erro ao registrar emergência:", error);
      toast.error(t("health.emergency.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('emergency_logs')
        .update({ resolved: true })
        .eq('id', id);

      if (error) throw error;

      toast.success(t("health.emergency.resolved_success"));
      setActiveEmergency(null);
    } catch (error) {
      console.error("Erro ao resolver emergência:", error);
      toast.error(t("health.emergency.update_error"));
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
      toast.error(t("health.emergency.history_error"));
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Alerta de Emergência Ativa */}
      {activeEmergency && (
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-lg animate-pulse border-2 border-red-400">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-black uppercase tracking-tight text-lg">{t("health.emergency.active")}</h4>
                <p className="text-sm font-medium opacity-90">{activeEmergency.description}</p>
                {activeEmergency.location && (
                  <p className="text-[10px] mt-1 font-bold bg-white/20 inline-block px-2 py-0.5 rounded">
                    {t("health.emergency.location").toUpperCase()}: {activeEmergency.location}
                  </p>
                )}
              </div>
            </div>
            <Button 
              onClick={() => handleResolve(activeEmergency.id)}
              disabled={loading}
              size="icon"
              className="bg-white text-red-600 hover:bg-green-50 hover:text-green-600 rounded-full shrink-0 shadow-md"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={24} />}
            </Button>
          </div>
        </div>
      )}

      {/* Barra de Ações */}
      <div className="flex items-center justify-between bg-muted/50 p-4 rounded-2xl border border-dashed">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-full border shadow-sm">
            <AlertCircle className="text-red-500" size={20} />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm">{t("health.emergency.title")}</h4>
            <p className="text-[10px] text-muted-foreground">{t("health.emergency.subtitle")}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={historyOpen} onOpenChange={(val) => {
            setHistoryOpen(val);
            if (val) fetchHistory();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-xl gap-1">
                <History size={14} />
                {t("health.emergency.history")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="text-primary" />
                  {t("health.emergency.history_title")}
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-4 pr-2">
                {historyLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t("health.emergency.no_records")}</p>
                ) : (
                  history.map((log) => (
                    <div key={log.id} className={cn(
                      "p-4 rounded-2xl border space-y-2",
                      log.resolved ? "bg-muted/30 border-muted" : "bg-red-50 border-red-100"
                    )}>
                      <div className="flex justify-between items-start">
                        <span className={cn(
                          "text-[10px] font-bold uppercase",
                          log.resolved ? "text-muted-foreground" : "text-red-600"
                        )}>
                          {new Date(log.created_at).toLocaleDateString(i18n.language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {log.resolved && (
                          <span className="text-[8px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">{t("common.resolved")}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{log.description}</p>
                      {(log.location || log.contact_phone) && (
                        <div className="pt-1 border-t border-black/5 flex flex-wrap gap-3">
                          {log.location && (
                            <p className="text-[10px] text-muted-foreground">
                              <span className="font-bold">{t("health.emergency.location")}:</span> {log.location}
                            </p>
                          )}
                          {log.contact_phone && (
                            <p className="text-[10px] text-muted-foreground">
                              <span className="font-bold">{t("health.emergency.contact")}:</span> {log.contact_phone}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {!activeEmergency && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1">
                  <AlertCircle size={14} />
                  {t("health.emergency.trigger")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="text-red-600" />
                    {t("health.emergency.register_title")}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("health.emergency.description")}</Label>
                    <Textarea 
                      id="description"
                      placeholder={t("health.emergency.description_placeholder")}
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">{t("health.emergency.location")} ({t("common.optional")})</Label>
                    <Input 
                      id="location"
                      placeholder={t("health.emergency.location_placeholder")}
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("health.emergency.contact")} ({t("common.optional")})</Label>
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
                      {loading ? <Loader2 className="animate-spin" /> : t("health.emergency.confirm_log")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
};
