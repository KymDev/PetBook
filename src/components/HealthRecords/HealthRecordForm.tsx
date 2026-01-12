import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Info, Scale, AlertTriangle, Pill, Search, Syringe, FlaskConical, Stethoscope, ClipboardList, Scissors, Thermometer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';
import { createHealthRecord, updateHealthRecord, createPendingHealthRecord } from '@/integrations/supabase/healthRecordsService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Tipos do Supabase
type HealthRecord = Database['public']['Tables']['health_records']['Row'];
type HealthRecordInsert = Database['public']['Tables']['health_records']['Insert'];
type PendingHealthRecordInsert = Database['public']['Tables']['pending_health_records']['Insert'];

// Definir o Schema de Validação
const healthRecordSchema = z.object({
  professional_name: z.string().optional(),
  title: z.string().min(2, { message: 'O título deve ter pelo menos 2 caracteres.' }),
  record_type: z.enum(['vacina', 'consulta', 'exame', 'check_up', 'medicamento', 'cirurgia', 'alergia', 'peso', 'sintoma'], {
    required_error: 'Selecione um tipo de registro.',
  }),
  record_date: z.date({
    required_error: 'A data do registro é obrigatória.',
  }),
  observation: z.string().max(1000).optional(),
  attachment_url: z.string().url({ message: 'URL de anexo inválida.' }).optional().or(z.literal('')),
  weight: z.string().optional(),
  medication_name: z.string().optional(),
  allergy_description: z.string().optional(),
  follow_up_notes: z.string().optional(),
  set_reminder: z.boolean().default(false),
  reminder_date: z.date().optional(),
});

type HealthRecordFormValues = z.infer<typeof healthRecordSchema>;

interface HealthRecordFormProps {
  petId: string;
  initialData?: HealthRecord;
  onSuccess: () => void;
  onClose: () => void;
  isProfessionalSubmission?: boolean;
  professionalId?: string;
}

const HealthRecordForm: React.FC<HealthRecordFormProps> = ({ petId, initialData, onSuccess, onClose, isProfessionalSubmission, professionalId }) => {
  const isEdit = !!initialData;
  const { profile } = useAuth();
  const [standards, setStandards] = useState<any[]>([]);
  const [isLoadingStandards, setIsLoadingStandards] = useState(false);
  
  const defaultProfessionalName = initialData?.professional_name || 
                                 (profile?.account_type === 'professional' ? profile?.full_name : '') || 
                                 '';

  const form = useForm<HealthRecordFormValues>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      professional_name: defaultProfessionalName,
      title: initialData?.title || '',
      record_type: initialData?.record_type || 'vacina',
      record_date: initialData?.record_date ? new Date(initialData.record_date) : new Date(),
      observation: initialData?.observation || '',
      attachment_url: initialData?.attachment_url || '',
      weight: '',
      medication_name: '',
      allergy_description: '',
      follow_up_notes: '',
      set_reminder: false,
    },
  });

  const watchType = form.watch('record_type');

  useEffect(() => {
    if (watchType === 'vacina' || watchType === 'exame') {
      fetchStandards();
    } else {
      setStandards([]);
    }
  }, [watchType]);

  const fetchStandards = async () => {
    setIsLoadingStandards(true);
    try {
      const table = watchType === 'vacina' ? 'health_standards_vaccines' : 'health_standards_exams';
      const { data, error } = await supabase.from(table).select('*').order('name');
      if (error) throw error;
      setStandards(data || []);
    } catch (error) {
      console.error("Erro ao buscar padrões:", error);
    } finally {
      setIsLoadingStandards(false);
    }
  };

  const onSubmit = async (values: HealthRecordFormValues) => {
    let result;
    let finalObservation = values.observation || '';
    
    if (values.record_type === 'peso' && values.weight) {
      finalObservation = `Peso: ${values.weight}kg\n${finalObservation}`;
    } else if (values.record_type === 'medicamento' && values.medication_name) {
      finalObservation = `Medicamento: ${values.medication_name}\n${finalObservation}`;
    } else if (values.record_type === 'alergia' && values.allergy_description) {
      finalObservation = `Alergia: ${values.allergy_description}\n${finalObservation}`;
    }

    if (isProfessionalSubmission && professionalId) {
      const followUpText = values.follow_up_notes ? `\n\n[Acompanhamento Profissional]: ${values.follow_up_notes}` : '';
      
      const pendingRecordData: PendingHealthRecordInsert = {
        pet_id: petId,
        professional_user_id: professionalId,
        record_type: values.record_type,
        professional_name: values.professional_name || profile?.full_name || 'Profissional PetBook',
        record_date: values.record_date.toISOString(),
        observation: finalObservation + followUpText || null,
        attachment_url: values.attachment_url || null,
        status: 'pending',
        title: values.title,
      };
      
      result = await createPendingHealthRecord(pendingRecordData);
      
      if (result.error) {
        toast.error(`Erro ao submeter ficha: ${result.error.message}`);
      } else {
        toast.success(`Ficha de saúde submetida para aprovação do guardião!`);
        onSuccess();
        onClose();
      }
      return;

    } else {
      const recordData: HealthRecordInsert = {
        pet_id: petId,
        title: values.title,
        record_type: values.record_type,
        record_date: values.record_date.toISOString(),
        professional_name: values.professional_name || (profile?.account_type === 'professional' ? profile?.full_name : 'Guardião'),
        observation: finalObservation || null,
        attachment_url: values.attachment_url || null,
      };

      if (isEdit && initialData) {
        result = await updateHealthRecord(initialData.id, recordData);
      } else {
        result = await createHealthRecord(recordData);
      }

      if (result.error) {
        toast.error(`Erro ao ${isEdit ? 'atualizar' : 'criar'} registro: ${result.error.message}`);
      } else {
        if (values.set_reminder && values.reminder_date) {
          await supabase.from('notifications').insert({
            pet_id: petId,
            type: 'health_reminder',
            message: `Lembrete definido: ${values.title} para o dia ${format(values.reminder_date, 'dd/MM/yyyy')}`,
            is_read: false
          });
        }

        toast.success(`Registro de saúde ${isEdit ? 'atualizado' : 'criado'} com sucesso!`);
        onSuccess();
        onClose();
      }
    }
  };

  const recordTypes = [
    { value: 'vacina', label: 'Vacina', icon: Syringe, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { value: 'consulta', label: 'Consulta Veterinária', icon: Stethoscope, color: 'text-green-600', bgColor: 'bg-green-50' },
    { value: 'exame', label: 'Exame', icon: FlaskConical, color: 'text-red-600', bgColor: 'bg-red-50' },
    { value: 'check_up', label: 'Check-up', icon: ClipboardList, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { value: 'medicamento', label: 'Medicamento', icon: Pill, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { value: 'cirurgia', label: 'Cirurgia', icon: Scissors, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { value: 'alergia', label: 'Alergia', icon: AlertTriangle, color: 'text-red-700', bgColor: 'bg-red-100' },
    { value: 'peso', label: 'Peso', icon: Scale, color: 'text-teal-600', bgColor: 'bg-teal-50' },
    { value: 'sintoma', label: 'Sintoma', icon: Thermometer, color: 'text-amber-700', bgColor: 'bg-amber-50' },
  ];

  const currentTypeInfo = recordTypes.find(t => t.value === watchType) || recordTypes[0];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isProfessionalSubmission && (
          <div className="bg-blue-50 p-3 rounded-md flex gap-2 items-start mb-4">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700">
              Como profissional, seu registro será enviado para o guardião aprovar antes de aparecer na ficha definitiva.
            </p>
          </div>
        )}

        {/* Cabeçalho de Contexto Visual */}
        <div className={cn("p-4 rounded-xl border flex items-center gap-4 transition-colors duration-300", currentTypeInfo.bgColor, "border-" + currentTypeInfo.color.split('-')[1] + "-200")}>
          <div className={cn("p-3 rounded-full bg-white shadow-sm", currentTypeInfo.color)}>
            <currentTypeInfo.icon size={24} />
          </div>
          <div>
            <h3 className={cn("font-bold text-lg", currentTypeInfo.color)}>{currentTypeInfo.label}</h3>
            <p className="text-xs text-muted-foreground">Preencha os detalhes do procedimento abaixo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="record_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Registro</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {recordTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon size={14} className={type.color} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="record_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-2">Data do Registro</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full h-11 justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Selecione uma data</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título / Nome do Procedimento</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input className="h-11" placeholder={`Ex: ${watchType === 'vacina' ? 'Vacina V10' : watchType === 'exame' ? 'Hemograma' : 'Consulta de Rotina'}`} {...field} />
                </FormControl>
                {(watchType === 'vacina' || watchType === 'exame') && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" type="button" className="h-11 w-11 shrink-0" title="Sugestões">
                        <Search className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="end">
                      <div className={cn("p-2 border-b", currentTypeInfo.bgColor)}>
                        <p className={cn("text-xs font-bold uppercase tracking-wider", currentTypeInfo.color)}>Sugestões de {watchType === 'vacina' ? 'Vacinas' : 'Exames'}</p>
                      </div>
                      <div className="max-h-[250px] overflow-y-auto p-1">
                        {isLoadingStandards ? (
                          <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Carregando...
                          </div>
                        ) : standards.length > 0 ? (
                          standards.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center justify-between group"
                              onClick={() => {
                                form.setValue('title', s.name);
                              }}
                            >
                              <span>{s.name}</span>
                              <Plus size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground">Nenhuma sugestão encontrada.</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <FormDescription>
                Digite o nome ou use o botão de busca para ver opções comuns.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="professional_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profissional Responsável</FormLabel>
              <FormControl>
                <Input className="h-11" placeholder="Nome do veterinário ou clínica" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchType === 'peso' && (
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Scale className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-11" placeholder="Ex: 12.5" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchType === 'medicamento' && (
          <FormField
            control={form.control}
            name="medication_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Medicamento</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Pill className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-11" placeholder="Ex: Apoquel 5.4mg" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchType === 'alergia' && (
          <FormField
            control={form.control}
            name="allergy_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição da Alergia</FormLabel>
                <FormControl>
                  <div className="relative">
                    <AlertTriangle className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-11" placeholder="Ex: Alergia a picada de pulga" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="observation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações / Notas</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detalhes adicionais sobre o procedimento..." 
                  className="resize-none min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attachment_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link do Anexo (Opcional)</FormLabel>
              <FormControl>
                <Input className="h-11" placeholder="https://..." {...field} />
              </FormControl>
              <FormDescription>Link para PDF de exame ou foto da receita.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between rounded-xl border p-4 shadow-sm bg-muted/20">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Definir Lembrete</FormLabel>
              <FormDescription>
                Receber uma notificação para este registro no futuro.
              </FormDescription>
            </div>
            <FormField
              control={form.control}
              name="set_reminder"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {form.watch('set_reminder') && (
            <FormField
              control={form.control}
              name="reminder_date"
              render={({ field }) => (
                <FormItem className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormLabel className="mb-2">Data do Lembrete</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full h-11 justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Selecione uma data</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" className="h-12 px-6 rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className={cn("h-12 px-8 rounded-xl font-bold shadow-md transition-all", currentTypeInfo.color.replace('text', 'bg'), "hover:opacity-90 text-white")}>
            {isEdit ? 'Atualizar Registro' : 'Salvar Registro'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default HealthRecordForm;
