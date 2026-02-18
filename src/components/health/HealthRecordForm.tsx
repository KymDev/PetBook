import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, User, Weight, Calendar, AlertCircle, Pill, ClipboardList, Syringe, FlaskConical, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const HealthRecordForm: React.FC<{ petId: string, onSave: () => void }> = ({ petId, onSave }) => {
  const { t } = useTranslation();
  const [type, setType] = useState('vaccine');
  const [standards, setStandards] = useState<any[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [energyLevel, setEnergyLevel] = useState('normal');
  const [appetiteLevel, setAppetiteLevel] = useState('normal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStandards();
  }, [type]);

  const fetchStandards = async () => {
    const table = type === 'vaccine' ? 'health_standards_vaccines' : 'health_standards_exams';
    const { data } = await supabase.from(table).select('*').order('name');
    
    if (data) {
      const others = data.filter(s => s.name.toLowerCase().includes('outros') || s.name.toLowerCase().includes('others'));
      const rest = data.filter(s => !s.name.toLowerCase().includes('outros') && !s.name.toLowerCase().includes('others'));
      setStandards([...others, ...rest]);
    } else {
      setStandards([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const selectedStandard = standards.find(s => s.id === selectedStandardId);
      const payload: any = {
        pet_id: petId,
        record_type: type === 'vaccine' ? 'vacina' : 'exame',
        record_date: date,
        notes: notes,
        weight: weight ? `${weight}kg` : null,
        professional_name: professionalName,
        title: selectedStandard?.name || 'Registro Manual',
        allergies: allergies || null,
        medications: medications || null,
        energy_level: energyLevel,
        appetite_level: appetiteLevel
      };

      if (type === 'vaccine') payload.vaccine_id = selectedStandardId;
      else payload.exam_id = selectedStandardId;

      const { error } = await supabase.from('health_records').insert(payload);
      
      if (error) throw error;

      toast.success(t("health.save_success"));
      onSave();
      // Limpar campos
      setNotes('');
      setAllergies('');
      setMedications('');
      setWeight('');
      setProfessionalName('');
      setSelectedStandardId('');
      setEnergyLevel('normal');
      setAppetiteLevel('normal');
    } catch (error: any) {
      console.error("Erro ao salvar registro:", error);
      toast.error(t("common.error_action"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const accentColor = type === 'vaccine' ? 'text-emerald-600' : 'text-blue-600';
  const bgColor = type === 'vaccine' ? 'bg-emerald-50/50' : 'bg-blue-50/50';
  const borderColor = type === 'vaccine' ? 'border-emerald-100' : 'border-blue-100';
  const buttonClass = type === 'vaccine' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex bg-muted/50 p-1.5 rounded-2xl mb-2 shadow-inner">
        <button 
          type="button"
          onClick={() => setType('vaccine')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all duration-300",
            type === 'vaccine' ? "bg-white shadow-md text-emerald-600 scale-[1.02]" : "text-muted-foreground hover:text-foreground opacity-70"
          )}
        >
          <Syringe size={18} className={type === 'vaccine' ? "animate-pulse" : ""} />
          {t("health.vaccination")}
        </button>
        <button 
          type="button"
          onClick={() => setType('exam')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all duration-300",
            type === 'exam' ? "bg-white shadow-md text-blue-600 scale-[1.02]" : "text-muted-foreground hover:text-foreground opacity-70"
          )}
        >
          <FlaskConical size={18} className={type === 'exam' ? "animate-pulse" : ""} />
          {t("health.exams")}
        </button>
      </div>

      <div className={cn("p-5 rounded-2xl border mb-4 flex items-start gap-4 transition-colors duration-500", bgColor, borderColor)}>
        <div className={cn("p-3 rounded-xl bg-white shadow-sm ring-4 ring-white/50", accentColor)}>
          {type === 'vaccine' ? <Syringe size={22} /> : <FlaskConical size={22} />}
        </div>
        <div className="flex-1">
          <h4 className={cn("font-black text-sm uppercase tracking-tight", accentColor)}>
            {type === 'vaccine' ? t("health.new_vaccine_record") : t("health.new_exam_record")}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed">
            {type === 'vaccine' 
              ? t("health.vaccine_tip") 
              : t("health.exam_tip")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <Calendar size={12} className="text-primary/70" />
              {t("health.date")}
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-sm"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              {type === 'vaccine' ? <Syringe size={12} className="text-emerald-500" /> : <FlaskConical size={12} className="text-blue-500" />}
              {type === 'vaccine' ? t("health.which_vaccine") : t("health.which_exam")}
            </label>
            <div className="relative">
              <select 
                value={selectedStandardId} 
                onChange={(e) => setSelectedStandardId(e.target.value)}
                required
                className={cn(
                  "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none shadow-sm",
                  selectedStandardId && standards.find(s => s.id === selectedStandardId)?.name.toLowerCase().includes('outros') && "border-amber-400 ring-4 ring-amber-400/10"
                )}
              >
                <option value="">{t("common.select_from_list")}</option>
                {standards.map(s => (
                  <option key={s.id} value={s.id} className={s.name.toLowerCase().includes('outros') ? "font-black text-amber-600" : "font-medium"}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <ClipboardList size={16} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <Weight size={12} className="text-amber-500" />
              {t("health.weight")} (kg)
            </label>
            <input 
              type="number" 
              step="0.01"
              value={weight} 
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 12.5"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <User size={12} className="text-blue-500" />
              {t("health.professional")}
            </label>
            <input 
              type="text" 
              value={professionalName} 
              onChange={(e) => setProfessionalName(e.target.value)}
              placeholder={t("health.professional_placeholder")}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <AlertCircle size={12} className="text-red-500" />
              {t("health.allergies_label")}
            </label>
            <input 
              type="text" 
              value={allergies} 
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Ex: Penicilina"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-400 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <Pill size={12} className="text-indigo-500" />
              {t("health.medications_label")}
            </label>
            <input 
              type="text" 
              value={medications} 
              onChange={(e) => setMedications(e.target.value)}
              placeholder="Ex: Apoquel"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/30 shadow-inner">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              {t("health.energy_level")}
            </label>
            <select 
              value={energyLevel} 
              onChange={(e) => setEnergyLevel(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none shadow-sm"
            >
              <option value="baixo">{t("health.energy_low")}</option>
              <option value="normal">{t("health.energy_normal")}</option>
              <option value="alto">{t("health.energy_high")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              {t("health.appetite_level")}
            </label>
            <select 
              value={appetiteLevel} 
              onChange={(e) => setAppetiteLevel(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none shadow-sm"
            >
              <option value="baixo">{t("health.appetite_low")}</option>
              <option value="normal">{t("health.appetite_normal")}</option>
              <option value="alto">{t("health.appetite_high")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
            <ClipboardList size={12} className="text-primary/70" />
            {t("health.notes")}
          </label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            placeholder={selectedStandardId && standards.find(s => s.id === selectedStandardId)?.name.toLowerCase().includes('outros') 
              ? t("health.specify_here") 
              : t("health.notes_placeholder")}
            className={cn(
              "flex min-h-[120px] w-full rounded-2xl border border-input bg-background px-4 py-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none shadow-sm",
              selectedStandardId && standards.find(s => s.id === selectedStandardId)?.name.toLowerCase().includes('outros') && "ring-4 ring-amber-400/20 border-amber-400 bg-amber-50/30"
            )}
            rows={4}
          />
        </div>

        <Button 
          type="submit"
          className={cn("w-full h-16 text-lg font-black shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl text-white transform hover:scale-[1.01] active:scale-[0.99]", buttonClass)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              {t("common.saving")}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-6 w-6" />
              {`${t("common.confirm")} ${type === 'vaccine' ? t("health.vaccination") : t("health.exams")}`}
            </>
          )}
        </Button>
      </form>
    </div>
  );
};
