import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown, ChevronRight, Syringe, FlaskConical, ClipboardList, ChevronLeft, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { HealthRecordDetails } from './HealthRecordDetails';
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthRecord {
  id: string;
  record_date: string;
  title: string;
  record_type: string;
  notes: string;
  observation?: string;
  version: number;
  professional_name?: string;
  attachment_url?: string;
  allergies?: string;
  medications?: string;
  health_standards_vaccines?: { name: string };
  health_standards_exams?: { name: string };
}

const HealthRecordSkeleton = () => (
  <div className="flex items-center gap-3 p-3 md:p-4 bg-muted/20 rounded-2xl border border-transparent">
    <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  </div>
);

export const HealthDashboard: React.FC<{ petId: string }> = ({ petId }) => {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHealthTimeline();
  }, [petId]);

  const fetchHealthTimeline = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select(`
          *,
          health_standards_vaccines(name),
          health_standards_exams(name)
        `)
        .eq('pet_id', petId)
        .order('record_date', { ascending: false });

      if (error) throw error;
      if (data) setRecords(data as any);
    } catch (error: any) {
      console.error("Erro ao buscar histórico:", error);
      toast.error(t("health.load_error"));
    } finally {
      setLoading(false);
    }
  };

  const getRecordIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vacina': return <Syringe size={18} className="text-emerald-500" />;
      case 'exame': return <FlaskConical size={18} className="text-blue-500" />;
      case 'consulta': return <HeartPulse size={18} className="text-rose-500" />;
      default: return <ClipboardList size={18} className="text-primary" />;
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

  if (selectedRecord) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedRecord(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronLeft size={20} />
          {t("common.back_to_list")}
        </Button>
        <div className="p-6 bg-card rounded-2xl shadow-sm border">
          <HealthRecordDetails 
            record={selectedRecord} 
            onClose={() => setSelectedRecord(null)} 
            onDelete={fetchHealthTimeline}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-card rounded-2xl shadow-sm border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full sm:hidden"
          >
            <ChevronLeft size={24} />
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">{t("health.title")}</h2>
            <p className="text-xs md:text-sm text-muted-foreground">{t("health.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <>
            <HealthRecordSkeleton />
            <HealthRecordSkeleton />
            <HealthRecordSkeleton />
          </>
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
            <ClipboardList className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("common.no_results")}</p>
          </div>
        ) : records.map((record) => (
          <div 
            key={record.id} 
            onClick={() => setSelectedRecord(record)}
            className="group relative flex items-center gap-3 p-3 md:p-4 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-primary/10"
          >
            <div className={cn("p-2.5 md:p-3 rounded-xl border shrink-0", getRecordBadgeClass(record.record_type))}>
              {getRecordIcon(record.record_type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", getRecordBadgeClass(record.record_type))}>
                  {getRecordTypeLabel(record.record_type)}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {new Date(record.record_date).toLocaleDateString(i18n.language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
              </div>
              <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {record.health_standards_vaccines?.name || record.health_standards_exams?.name || record.title}
              </h3>
              
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {record.professional_name && (
                  <p className="text-[10px] md:text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="font-semibold">{t("health.professional_short")}:</span> {record.professional_name.split(' ')[0]}
                  </p>
                )}
                {(record.notes || record.observation) && (
                  <p className="text-[10px] md:text-[11px] text-muted-foreground truncate max-w-[120px] md:max-w-[150px]">
                    <span className="font-semibold">{t("common.obs")}:</span> {record.notes || record.observation}
                  </p>
                )}
              </div>
            </div>
            
            <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        ))}
      </div>
    </div>
  );
};
