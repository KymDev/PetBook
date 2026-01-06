import React from 'react';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
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
  // Novos campos para anotações contextuais (Profissional)
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
  const isHealthProfessional = profile?.professional_service_type === 'veterinario';

  const form = useForm<HealthRecordFormValues>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      professional_name: initialData?.professional_name || profile?.full_name || '',
      title: initialData?.title || '',
      record_type: initialData?.record_type || 'vacina',
      record_date: initialData?.record_date ? new Date(initialData.record_date) : new Date(),
      observation: initialData?.observation || '',
      attachment_url: initialData?.attachment_url || '',
      follow_up_notes: '',
      set_reminder: false,
    },
  });

  const onSubmit = async (values: HealthRecordFormValues) => {
    let result;

    if (isProfessionalSubmission && professionalId) {
      // Submissão de Profissional (Registro Pendente)
      const observationText = values.observation || '';
      const followUpText = values.follow_up_notes ? `\n\n[Acompanhamento Profissional]: ${values.follow_up_notes}` : '';
      
      const pendingRecordData: PendingHealthRecordInsert = {
        pet_id: petId,
        professional_user_id: professionalId,
        record_type: values.record_type,
        professional_name: values.professional_name || null,
        record_date: values.record_date.toISOString(),
        observation: observationText + followUpText || null,
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
      // Submissão de Guardião (Registro Direto)
      const recordData: HealthRecordInsert = {
        pet_id: petId,
        title: values.title,
        record_type: values.record_type,
        record_date: values.record_date.toISOString(),
        professional_name: values.professional_name || null,
        observation: values.observation || null,
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
        // Se houver lembrete, criar uma notificação agendada (simulada aqui por uma notificação imediata de confirmação)
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
    { value: 'vacina', label: 'Vacina' },
    { value: 'consulta', label: 'Consulta Veterinária' },
    { value: 'exame', label: 'Exame' },
    { value: 'check_up', label: 'Check-up' },
    { value: 'medicamento', label: 'Medicamento' },
    { value: 'cirurgia', label: 'Cirurgia' },
    { value: 'alergia', label: 'Alergia' },
    { value: 'peso', label: 'Peso' },
    { value: 'sintoma', label: 'Sintoma' },
  ];

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

        {(isProfessionalSubmission || isEdit) && (
          <FormField
            control={form.control}
            name="professional_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Profissional</FormLabel>
                <FormControl>
                  <Input placeholder="Seu Nome/Clínica" {...field} disabled={isEdit && !isProfessionalSubmission} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Vacina V8 Anual" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="record_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Registro</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {recordTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
              <FormLabel>Data do Registro</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
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

        <FormField
          control={form.control}
          name="observation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação / Diagnóstico</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalhes importantes sobre o registro..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isProfessionalSubmission && (
          <FormField
            control={form.control}
            name="follow_up_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-blue-600">Anotações de Acompanhamento</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="O que o tutor deve acompanhar? (Ex: febre, apetite)" 
                    className="border-blue-200 focus-visible:ring-blue-500"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="attachment_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Anexo (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ex: https://storage.supabase.co/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="set_reminder"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Definir Lembrete</FormLabel>
                <p className="text-xs text-muted-foreground">Notificar sobre o próximo evento (ex: reforço de vacina)</p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('set_reminder') && (
          <FormField
            control={form.control}
            name="reminder_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data do Lembrete</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Selecione a data do lembrete</span>}
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

        <Button type="submit" className="w-full gradient-bg" disabled={form.formState.isSubmitting || (isProfessionalSubmission && !isHealthProfessional)}>
          {form.formState.isSubmitting ? 'Salvando...' : isProfessionalSubmission ? 'Submeter Ficha para Aprovação' : isEdit ? 'Atualizar Registro' : 'Criar Registro'}
        </Button>
        {isProfessionalSubmission && !isHealthProfessional && (
          <p className="text-sm text-red-500 text-center">Apenas profissionais de saúde podem adicionar fichas de saúde.</p>
        )}
      </form>
    </Form>
  );
};

export default HealthRecordForm;
