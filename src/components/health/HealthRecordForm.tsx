import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, User, Weight, Calendar, AlertCircle, Pill, ClipboardList, Syringe, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export const HealthRecordForm: React.FC<{ petId: string, onSave: () => void }> = ({ petId, onSave }) => {
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
      // Colocar "Outros" no topo
      const others = data.filter(s => s.name.toLowerCase().includes('outros'));
      const rest = data.filter(s => !s.name.toLowerCase().includes('outros'));
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

      toast.success(`${type === 'vaccine' ? 'Vacina' : 'Exame'} salvo com sucesso!`);
      onSave();
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
      toast.error("Erro ao salvar registro médico.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const accentColor = type === 'vaccine' ? 'text-emerald-600' : 'text-blue-600';
  const bgColor = type === 'vaccine' ? 'bg-emerald-50' : 'bg-blue-50';
  const borderColor = type === 'vaccine' ? 'border-emerald-100' : 'border-blue-100';
  const buttonClass = type === 'vaccine' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="space-y-6">
      <div className="flex bg-muted p-1.5 rounded-2xl mb-2">
        <button 
          type="button"
          onClick={() => setType('vaccine')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200",
            type === 'vaccine' ? "bg-white shadow-md text-emerald-600" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Syringe size={18} />
          Vacinação
        </button>
        <button 
          type="button"
          onClick={() => setType('exam')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200",
            type === 'exam' ? "bg-white shadow-md text-blue-600" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FlaskConical size={18} />
          Exames
        </button>
      </div>

      <div className={cn("p-4 rounded-2xl border mb-4 flex items-start gap-3", bgColor, borderColor)}>
        <div className={cn("p-2 rounded-lg bg-white shadow-sm", accentColor)}>
          {type === 'vaccine' ? <Syringe size={20} /> : <FlaskConical size={20} />}
        </div>
        <div>
          <h4 className={cn("font-bold text-sm", accentColor)}>
            {type === 'vaccine' ? 'Novo Registro de Vacina' : 'Novo Registro de Exame'}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {type === 'vaccine' 
              ? 'Mantenha a imunização do seu pet em dia.' 
              : 'Registre os resultados de exames para acompanhamento.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <Calendar size={12} />
              Data
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              {type === 'vaccine' ? <Syringe size={12} /> : <FlaskConical size={12} />}
              {type === 'vaccine' ? 'Qual Vacina?' : 'Qual Exame?'}
            </label>
            <select 
              value={selectedStandardId} 
              onChange={(e) => setSelectedStandardId(e.target.value)}
              required
              className={cn(
                "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none",
                selectedStandardId && standards.find(s => s.id === selectedStandardId)?.name.toLowerCase().includes('outros') && "border-amber-500 ring-1 ring-amber-500/10"
              )}
            >
              <option value="">Selecione na lista...</option>
              {standards.map(s => (
                <option key={s.id} value={s.id} className={s.name.toLowerCase().includes('outros') ? "font-bold text-amber-600" : ""}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <Weight size={12} />
              Peso (kg)
            </label>
            <input 
              type="number" 
              step="0.01"
              value={weight} 
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 12.5"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <User size={12} />
              Veterinário
            </label>
            <input 
              type="text" 
              value={professionalName} 
              onChange={(e) => setProfessionalName(e.target.value)}
              placeholder="Nome do profissional"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <AlertCircle size={12} className="text-red-500" />
              Alergias
            </label>
            <input 
              type="text" 
              value={allergies} 
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Ex: Penicilina"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              <Pill size={12} className="text-blue-500" />
              Medicamentos
            </label>
            <input 
              type="text" 
              value={medications} 
              onChange={(e) => setMedications(e.target.value)}
              placeholder="Ex: Apoquel"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-dashed">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              Energia / Disposição
            </label>
            <select 
              value={energyLevel} 
              onChange={(e) => setEnergyLevel(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
            >
              <option value="baixo">Baixa (Apatia)</option>
              <option value="normal">Normal</option>
              <option value="alto">Alta (Agitado)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
              Apetite
            </label>
            <select 
              value={appetiteLevel} 
              onChange={(e) => setAppetiteLevel(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
            >
              <option value="baixo">Baixo (Não comeu)</option>
              <option value="normal">Normal</option>
              <option value="alto">Alto (Muita fome)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
            <ClipboardList size={12} />
            Observações / Detalhes
          </label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            placeholder={selectedStandardId && standards.find(s => s.id === selectedStandardId)?.name.toLowerCase().includes('outros') 
              ? "ESPECIFIQUE AQUI: Qual vacina/exame foi feito?" 
              : "Alguma observação importante?"}
            className={cn(
              "flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none",
              selectedStandardId && standards.find(s => s.id === selectedStandardId)?.name.toLowerCase().includes('outros') && "ring-2 ring-amber-500/40 border-amber-500 bg-amber-50/30"
            )}
            rows={3}
          />
        </div>

        <Button 
          type="submit"
          className={cn("w-full h-14 text-base font-bold shadow-md hover:shadow-lg transition-all rounded-2xl text-white", buttonClass)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Salvando...
            </>
          ) : (
            `Confirmar ${type === 'vaccine' ? 'Vacinação' : 'Exame'}`
          )}
        </Button>
      </form>
    </div>
  );
};
