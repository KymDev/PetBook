import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getHealthRecords,
  deleteHealthRecord,
  getPendingHealthRecords,
  updatePendingHealthRecordStatus,
} from '@/integrations/supabase/healthRecordsService';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  CalendarIcon,
  FileText,
  Link,
  Lock,
  Activity,
  History,
  CheckCircle,
  AlertCircle,
  Syringe,
  Stethoscope,
  FlaskConical,
  ClipboardList,
  Pill,
  Scissors,
  AlertTriangle,
  Scale,
  Thermometer,
  Clock,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HealthRecordForm from './HealthRecordForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';

/* =====================
   TIPOS
===================== */

type HealthRecord =
  Database['public']['Tables']['health_records']['Row'];

/* =====================
   MAPA DE TIPOS
===================== */

const recordTypeMap: Record<
  string,
  { label: string; icon: React.FC<any>; color: string }
> = {
  vacina: { label: 'Vacina', icon: Syringe, color: 'text-blue-500' },
  consulta: { label: 'Consulta', icon: Stethoscope, color: 'text-green-500' },
  exame: { label: 'Exame', icon: FlaskConical, color: 'text-red-500' },
  check_up: { label: 'Check-up', icon: ClipboardList, color: 'text-yellow-500' },
  medicamento: { label: 'Medicamento', icon: Pill, color: 'text-purple-500' },
  cirurgia: { label: 'Cirurgia', icon: Scissors, color: 'text-orange-500' },
  alergia: { label: 'Alergia', icon: AlertTriangle, color: 'text-red-600' },
  peso: { label: 'Peso', icon: Scale, color: 'text-teal-500' },
  sintoma: { label: 'Sintoma', icon: Thermometer, color: 'text-amber-600' },
};

/* =====================
   PROPS
===================== */

interface HealthRecordsPageProps {
  petId: string;
  petName: string;
}

/* =====================
   COMPONENTE
===================== */

const HealthRecordsPage: React.FC<HealthRecordsPageProps> = ({
  petId,
  petName,
}) => {
  const { profile } = useAuth();

  const isGuardian = profile?.account_type === 'guardian' || profile?.account_type === 'user';
  const isProfessional = profile?.account_type === 'professional';
  const isHealthProfessional = isProfessional && profile?.professional_service_type === 'veterinario';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<HealthRecord | undefined>();

  /* =====================
     QUERIES
  ===================== */

  const {
    data: records,
    isLoading: isLoadingRecords,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: ['healthRecords', petId],
    queryFn: async () => {
      const res = await getHealthRecords(petId);
      if (res.error) {
        if (res.error.code === '42501') return null;
        throw new Error(res.error.message);
      }
      return res.data;
    },
    enabled: !!petId,
  });

  const {
    data: pendingRecords,
    isLoading: isLoadingPending,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['pendingHealthRecords', petId, profile?.id],
    queryFn: async () => {
      const res = await getPendingHealthRecords(profile!.id);
      if (res.error) throw new Error(res.error.message);
      return res.data?.filter((r) => r.pet_id === petId);
    },
    enabled: !!profile?.id && !!petId,
  });

  const refetchAll = () => {
    refetchRecords();
    refetchPending();
  };

  /* =====================
     HANDLERS
  ===================== */

  const handleDelete = async (recordId: string) => {
    const { error } = await deleteHealthRecord(recordId);
    if (error) {
      toast.error(`Erro ao deletar registro: ${error.message}`);
      return;
    }
    toast.success('Registro deletado com sucesso!');
    refetchAll();
  };

  const handleApprovePending = async (recordId: string) => {
    const { error } = await updatePendingHealthRecordStatus(
      recordId,
      'approved'
    );
    if (error) {
      toast.error(`Erro ao aprovar ficha: ${error.message}`);
      return;
    }
    toast.success('Ficha aprovada com sucesso!');
    refetchAll();
  };

  const handleRejectPending = async (recordId: string) => {
    const { error } = await updatePendingHealthRecordStatus(
      recordId,
      'rejected'
    );
    if (error) {
      toast.error(`Erro ao rejeitar ficha: ${error.message}`);
      return;
    }
    toast.success('Ficha rejeitada.');
    refetchAll();
  };

  const handleOpenForm = (record?: HealthRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingRecord(undefined);
    setIsFormOpen(false);
  };

  /* =====================
     ESTADOS
  ===================== */

  if (isLoadingRecords || isLoadingPending) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isProfessional && records === null) {
    return (
      <div className="text-center p-10 border rounded-lg m-4 bg-secondary/5">
        <Lock className="h-12 w-12 text-red-500/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Acesso restrito
        </h2>
        <p className="text-gray-500">
          O guardião ainda não concedeu acesso aos registros
          deste pet.
        </p>
        <Button variant="outline" className="mt-4">Solicitar Acesso</Button>
      </div>
    );
  }

  /* =====================
     RENDER
  ===================== */

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Ficha de Saúde: {petName}
          </h1>
          {isProfessional && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Activity className="h-3 w-3" />
              Modo de Visualização Profissional
            </p>
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {isGuardian && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 md:flex-none gap-2">
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Compartilhar Histórico de Saúde</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    O tutor é dono do dado. O profissional é convidado a colaborar.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-2">
                    <h4 className="text-sm font-semibold text-blue-800">Níveis de Acesso:</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>🔹 <strong>Leitura:</strong> O profissional vê o histórico e o resumo.</li>
                      <li>🔹 <strong>Leitura + Comentário:</strong> O profissional pode sugerir ações e anotações.</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duração do Acesso:</label>
                    <Select defaultValue="7d">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 Horas</SelectItem>
                        <SelectItem value="7d">7 Dias</SelectItem>
                        <SelectItem value="30d">30 Dias</SelectItem>
                        <SelectItem value="forever">Até revogar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full gradient-bg" onClick={() => toast.success("Link de compartilhamento gerado!")}>
                    Gerar Link de Acesso
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {(isGuardian || isHealthProfessional) && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenForm()} className={isHealthProfessional ? "bg-blue-600 hover:bg-blue-700 flex-1 md:flex-none" : "flex-1 md:flex-none"}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isHealthProfessional ? 'Adicionar Atendimento' : 'Adicionar Registro'}
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isHealthProfessional ? 'Novo Atendimento Profissional' : (editingRecord ? 'Editar' : 'Novo') + ' Registro'}
                  </DialogTitle>
                </DialogHeader>

                <HealthRecordForm
                  petId={petId}
                  initialData={editingRecord}
                  onSuccess={refetchAll}
                  onClose={handleCloseForm}
                  isProfessionalSubmission={isHealthProfessional}
                  professionalId={profile?.id}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Resumo de Saúde Inteligente */}
      {records && records.length > 0 && (
        <Card className={isProfessional ? "bg-blue-50 border-blue-100" : "bg-primary/5 border-primary/10"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {isProfessional ? 'Resumo Contextual (Últimos 30 dias)' : 'Resumo de Saúde'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Peso Atual</p>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-teal-500" />
                  <span className="text-sm font-medium">
                    {records.find(r => r.record_type === 'peso')?.observation?.match(/\d+/)?.[0] || '--'} kg
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Última Vacina</p>
                <div className="flex items-center gap-2">
                  <Syringe className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {records.find(r => r.record_type === 'vacina') 
                      ? format(new Date(records.find(r => r.record_type === 'vacina')!.record_date), 'dd/MM', { locale: ptBR })
                      : '--'}
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Alergias</p>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">
                    {records.filter(r => r.record_type === 'alergia').length || 'Nenhuma'}
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Medicamentos</p>
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">
                    {records.filter(r => r.record_type === 'medicamento').length || 'Nenhum'}
                  </span>
                </div>
              </div>
            </div>

            {isProfessional && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Energia & Alimentação</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Relato de apetite normal</span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Sintomas Recentes</p>
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">
                      {records.filter(r => r.record_type === 'sintoma' && new Date(r.record_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} marcados
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Registros Pendentes (Apenas para Guardião Aprovar ou Profissional ver o que enviou) */}
      {pendingRecords && pendingRecords.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-yellow-700">
            <Clock className="h-5 w-5" />
            Registros Pendentes de Aprovação
          </h2>
          {pendingRecords.map((record) => (
            <Card key={record.id} className="border-yellow-200 bg-yellow-50/30">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                    <div>
                      <CardTitle className="text-base">Atendimento: {record.professional_name || 'Profissional'}</CardTitle>
                      <CardDescription>
                        Submetido em {format(new Date(record.created_at), 'dd/MM/yyyy')}
                      </CardDescription>
                    </div>
                  </div>
                  {isGuardian && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="bg-white" onClick={() => handleRejectPending(record.id)}>Recusar</Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprovePending(record.id)}>Aprovar</Button>
                    </div>
                  )}
                  {isProfessional && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">Aguardando Tutor</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 italic">"{record.observation}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {records && records.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Saúde
          </h2>
          {records.map((record) => {
            const typeInfo =
              recordTypeMap[record.record_type] ??
              recordTypeMap.vacina;
            const Icon = typeInfo.icon;

            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex justify-between flex-row items-center pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${typeInfo.color.replace('text-', 'bg-')}/10`}>
                      <Icon
                        className={`h-5 w-5 ${typeInfo.color}`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{record.title}</CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(
                          new Date(record.record_date),
                          "dd 'de' MMMM 'de' yyyy",
                          { locale: ptBR }
                        )}
                      </div>
                    </div>
                  </div>

                  {isGuardian && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          handleOpenForm(record)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Confirmar exclusão
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O registro será removido permanentemente da ficha do pet.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDelete(record.id)
                              }
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  {record.observation && (
                    <div className="text-sm text-gray-600 bg-secondary/5 p-3 rounded-lg border border-secondary/10">
                      {record.observation.split('\n').map((line, i) => (
                        <p key={i} className={line.startsWith('[Acompanhamento') ? "text-blue-700 font-medium mt-2" : ""}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 items-center text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Stethoscope className="h-3 w-3" />
                      <span>Profissional: {record.professional_name || 'Não informado'}</span>
                    </div>
                    
                    {record.attachment_url && (
                      <a
                        href={record.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:underline font-medium"
                      >
                        <Link className="mr-1 h-3 w-3" />
                        Ver anexo / Receita
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 border-2 border-dashed rounded-xl bg-secondary/5">
          <History className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">
            Nenhum registro encontrado
          </h2>
          <p className="text-gray-500 max-w-xs mx-auto mt-2">
            O histórico de saúde de {petName} está vazio. Comece adicionando vacinas, consultas ou exames.
          </p>
          {(isGuardian || isHealthProfessional) && (
            <Button onClick={() => handleOpenForm()} className="mt-6">
              Adicionar Primeiro Registro
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default HealthRecordsPage;
