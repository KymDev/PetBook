import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, User, FileText, Hash, Weight, AlertCircle, Pill, Trash2, Loader2, ChevronLeft, HeartPulse, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface HealthRecord {
  id: string;
  record_date: string;
  title: string;
  record_type: string;
  notes: string;
  observation?: string;
  version: number;
  weight?: string;
  professional_name?: string;
  attachment_url?: string;
  allergies?: string;
  medications?: string;
  energy_level?: string;
  appetite_level?: string;
  health_standards_vaccines?: { name: string };
  health_standards_exams?: { name: string };
}

interface HealthRecordDetailsProps {
  record: HealthRecord;
  onClose: () => void;
  onDelete?: () => void;
}

export const HealthRecordDetails: React.FC<HealthRecordDetailsProps> = ({ record, onClose, onDelete }) => {
  const { t, i18n } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('health_records')
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      toast.success(t("health.delete_success"));
      if (onDelete) onDelete();
      onClose();
    } catch (error: any) {
      console.error("Erro ao excluir registro:", error);
      toast.error(t("health.delete_error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const getRecordBadgeClass = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vacina': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'exame': return "bg-blue-50 text-blue-700 border-blue-100";
      case 'consulta': return "bg-rose-50 text-rose-700 border-rose-100";
      default: return "bg-primary/5 text-primary border-primary/10";
    }
  };

  const getRecordTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vacina': return t("health.vaccination");
      case 'exame': return t("health.exams");
      case 'consulta': return t("health.consultation");
      default: return type;
    }
  };

  return (
    <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9 hover:bg-muted transition-colors">
            <ChevronLeft size={20} />
          </Button>
          <h3 className="text-base md:text-lg font-bold text-foreground">{t("health.record_details")}</h3>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-9 w-9 transition-colors">
                <Trash2 size={18} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl w-[90vw] max-w-md border-none shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">{t("health.delete_record_title")}</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t("health.delete_record_desc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                <AlertDialogCancel className="rounded-xl mt-0 border-muted-foreground/20">{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  {t("health.delete_permanently")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-5 md:space-y-6">
        <div className="flex flex-col gap-1">
          <span className={cn("w-fit text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-2 shadow-sm", getRecordBadgeClass(record.record_type))}>
            {getRecordTypeLabel(record.record_type)}
          </span>
          <h2 className="text-xl md:text-2xl font-black text-foreground leading-tight tracking-tight">
            {record.health_standards_vaccines?.name || record.health_standards_exams?.name || record.title}
          </h2>
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mt-1 font-medium">
            <Calendar size={14} className="text-primary/60" />
            <span>{new Date(record.record_date).toLocaleDateString(i18n.language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {record.weight && (
            <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100/50 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                <Weight size={20} />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-amber-600 uppercase font-black tracking-widest">{t("health.weight_registered")}</p>
                <p className="font-bold text-sm md:text-base text-amber-900">{record.weight}</p>
              </div>
            </div>
          )}

          {record.professional_name && (
            <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/50 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
                <Stethoscope size={20} />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-blue-600 uppercase font-black tracking-widest">{t("health.professional")}</p>
                <p className="font-bold text-sm md:text-base text-blue-900">{record.professional_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Níveis de Energia e Apetite */}
        {(record.energy_level || record.appetite_level) && (
          <div className="grid grid-cols-2 gap-3">
            {record.energy_level && (
              <div className="px-4 py-3 bg-muted/20 rounded-xl border border-border/40 flex flex-col gap-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t("health.energy_level")}</span>
                <span className="text-xs font-bold text-foreground capitalize">{t(`health.energy_${record.energy_level}`)}</span>
              </div>
            )}
            {record.appetite_level && (
              <div className="px-4 py-3 bg-muted/20 rounded-xl border border-border/40 flex flex-col gap-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t("health.appetite_level")}</span>
                <span className="text-xs font-bold text-foreground capitalize">{t(`health.appetite_${record.appetite_level}`)}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 md:space-y-4">
          {record.allergies && (
            <div className="flex items-start gap-3 p-4 bg-red-50/30 rounded-2xl border border-red-100/50 shadow-sm">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <AlertCircle className="text-red-600" size={16} />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-black text-red-600 uppercase tracking-widest">{t("health.allergies_identified")}</p>
                <p className="text-xs md:text-sm text-red-900 font-bold mt-1 leading-relaxed">{record.allergies}</p>
              </div>
            </div>
          )}

          {record.medications && (
            <div className="flex items-start gap-3 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 shadow-sm">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Pill className="text-indigo-600" size={16} />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-black text-indigo-600 uppercase tracking-widest">{t("health.medications_prescribed")}</p>
                <p className="text-xs md:text-sm text-indigo-900 font-bold mt-1 leading-relaxed">{record.medications}</p>
              </div>
            </div>
          )}

          {(record.notes || record.observation) && (
            <div className="p-5 bg-muted/10 rounded-2xl border border-border/40 shadow-inner">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-background rounded-md shadow-sm">
                  <FileText size={14} className="text-primary/70" />
                </div>
                <p className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest">{t("health.clinical_notes")}</p>
              </div>
              <p className="text-xs md:text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">{record.notes || record.observation}</p>
            </div>
          )}
        </div>

        {record.attachment_url && (
          <a 
            href={record.attachment_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl border-2 border-dashed border-primary/20 text-primary font-black hover:bg-primary/5 hover:border-primary/40 transition-all text-sm md:text-base shadow-sm"
          >
            <FileText size={20} />
            {t("health.view_attachment")}
          </a>
        )}

        <div className="flex items-center justify-center gap-2 text-[9px] md:text-[10px] text-muted-foreground/60 uppercase tracking-widest pt-2 font-bold">
          <Hash size={10} />
          {t("health.record_version")}: {record.version}
        </div>
      </div>

      <div className="pt-4">
        <Button onClick={onClose} variant="outline" className="w-full h-12 md:h-14 rounded-2xl font-black text-sm md:text-base shadow-sm hover:bg-muted transition-all border-muted-foreground/20">
          {t("health.back_to_records")}
        </Button>
      </div>
    </div>
  );
};
