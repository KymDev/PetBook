import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getHealthRecords,
  deleteHealthRecord,
  getPendingHealthRecords,
  updatePendingHealthRecordStatus,
} from '@/integrations/supabase/healthRecordsService';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Trash2,
  Edit,
  CalendarIcon,
  FileText,
  Lock,
  Activity,
  History,
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
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Info
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
import { cn } from '@/lib/utils';

/* =====================
   TIPOS
===================== */

type HealthRecord = Database['public']['Tables']['health_records']['Row'];

/* =====================
   MAPA DE TIPOS
===================== */

const recordTypeMap: Record<
  string,
  { label: string; icon: React.FC<any>; color: string; bgColor: string; borderColor: string }
> = {
  vacina: { label: 'Vacina', icon: Syringe, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  consulta: { label: 'Consulta Veterinária', icon: Stethoscope, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  exame: { label: 'Exame', icon: FlaskConical, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  check_up: { label: 'Check-up', icon: ClipboardList, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  medicamento: { label: 'Medicamento', icon: Pill, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  cirurgia: { label: 'Cirurgia', icon: Scissors, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  alergia: { label: 'Alergia', icon: AlertTriangle, color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300' },
  peso: { label: 'Peso', icon: Scale, color: 'text-teal-600', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
  sintoma: { label: 'Sintoma', icon: Thermometer, color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
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
  const navigate = useNavigate();

  const isGuardian = profile?.account_type === 'guardian' || profile?.account_type === 'user';
  const isProfessional = profile?.account_type === 'professional';
  const isHealthProfessional = isProfessional && profile?.professional_service_type === 'veterinario';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | undefined>();
  const [expandedRecords, setExpandedRecords] = useState<Record<string, boolean>>({});

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

  const {
    data: accessRequests,
    isLoading: isLoadingAccessRequests,
    refetch: refetchAccessRequests,
  } = useQuery({
    queryKey: ['pendingAccessRequests', profile?.id],
    queryFn: async () => {
      const { getPendingHealthAccessRequests } = await import('@/integrations/supabase/healthRecordsService');
      const res = await getPendingHealthAccessRequests(profile!.id);
      if (res.error) throw new Error(res.error.message);
      return res.data?.filter(r => r.pet_id === petId);
    },
    enabled: !!profile?.id && !!petId && isGuardian,
  });

  const refetchAll = () => {
    refetchRecords();
    refetchPending();
    refetchAccessRequests();
  };

  /* =====================
     HANDLERS
  ===================== */

  const toggleExpand = (id: string) => {
    setExpandedRecords(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    const { error } = await updatePendingHealthRecordStatus(recordId, 'approved');
    if (error) {
      toast.error(`Erro ao aprovar ficha: ${error.message}`);
      return;
    }
    toast.success('Ficha aprovada com sucesso!');
    refetchAll();
  };

  const handleRejectPending = async (recordId: string) => {
    const { error } = await updatePendingHealthRecordStatus(recordId, 'rejected');
    if (error) {
      toast.error(`Erro ao rejeitar ficha: ${error.message}`);
      return;
    }
    toast.success('Ficha rejeitada.');
    refetchAll();
  };

  const handleApproveAccess = async (accessId: string) => {
    const { updateHealthAccessStatus } = await import('@/integrations/supabase/healthRecordsService');
    const { error } = await updateHealthAccessStatus(accessId, 'granted');
    if (error) {
      toast.error(`Erro ao aprovar acesso: ${error.message}`);
      return;
    }
    toast.success('Acesso concedido ao profissional!');
    refetchAll();
  };

  const handleRejectAccess = async (accessId: string) => {
    const { updateHealthAccessStatus } = await import('@/integrations/supabase/healthRecordsService');
    const { error } = await updateHealthAccessStatus(accessId, 'revoked');
    if (error) {
      toast.error(`Erro ao rejeitar acesso: ${error.message}`);
      return;
    }
    toast.success('Solicitação de acesso rejeitada.');
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

  if (isLoadingRecords || isLoadingPending) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isProfessional && records === null) {
    return (
      <div className="text-center p-10 border rounded-2xl m-4 bg-secondary/5">
        <Lock className="h-12 w-12 text-red-500/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
        <p className="text-gray-500">O guardião ainda não concedeu acesso aos registros deste pet.</p>
        <Button variant="outline" className="mt-4 rounded-xl">Solicitar Acesso</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* RESUMO CONTEXTUAL (ÚLTIMOS 30 DIAS) */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Resumo de Bem-estar (Últimos 30 dias)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Energia Média</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[85%]" />
                </div>
                <span className="text-sm font-bold text-green-600">Normal</span>
              </div>
            </div>

            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Apetite</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[90%]" />
                </div>
                <span className="text-sm font-bold text-blue-600">Excelente</span>
              </div>
            </div>

            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Último Evento</p>
              <p className="text-sm font-bold truncate">
                {records && records.length > 0 
                  ? `${records[0].title} (${format(new Date(records[0].record_date), "dd/MM")})`
                  : "Nenhum registro recente"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HEADER COM BOTÃO VOLTAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full bg-muted/50 hover:bg-muted"
          >
            <ChevronLeft size={24} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ficha de Saúde: {petName}</h1>
            {isProfessional && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Activity className="h-3 w-3" />
                Modo Profissional
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {isGuardian && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 md:flex-none gap-2 rounded-xl">
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Compartilhar Histórico</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">O tutor é dono do dado. O profissional é convidado a colaborar.</p>
                  <Button className="w-full gradient-bg rounded-xl" onClick={() => toast.success("Link gerado!")}>
                    Gerar Link de Acesso
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {(isGuardian || isHealthProfessional) && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 md:flex-none gap-2 gradient-bg rounded-xl shadow-md">
                  <Plus className="h-4 w-4" />
                  {isHealthProfessional ? 'Adicionar Atendimento' : 'Novo Registro'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {isHealthProfessional ? 'Novo Atendimento' : (editingRecord ? 'Editar' : 'Novo') + ' Registro'}
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

      {/* SOLICITAÇÕES DE ACESSO AO PRONTUÁRIO */}
      {isGuardian && accessRequests && accessRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-600">
            <Lock className="h-5 w-5" />
            Solicitações de Acesso ao Prontuário
          </h2>
          <div className="grid gap-4">
            {accessRequests.map((request) => (
              <Card key={request.id} className="border-blue-200 bg-blue-50/30 rounded-2xl overflow-hidden">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex gap-3">
                    <div className="p-2 bg-white rounded-full border border-blue-100">
                      <Stethoscope className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-bold">{(request as any).professional?.full_name || 'Profissional'}</h3>
                      <p className="text-xs text-muted-foreground">Solicitou acesso para ver o histórico de saúde de {petName}.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleRejectAccess(request.id)}>Recusar</Button>
                    <Button size="sm" className="bg-blue-600 rounded-lg text-white" onClick={() => handleApproveAccess(request.id)}>Permitir</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* REGISTROS PENDENTES (ATENDIMENTOS) */}
      {isGuardian && pendingRecords && pendingRecords.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            Atendimentos para Aprovar
          </h2>
          <div className="grid gap-4">
            {pendingRecords.map((record) => (
              <Card key={record.id} className="border-amber-200 bg-amber-50/30 rounded-2xl overflow-hidden">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex gap-3">
                    <div className="p-2 bg-white rounded-full border border-amber-100">
                      <Activity className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold">{record.title}</h3>
                      <p className="text-xs text-muted-foreground">Por: {record.professional_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleRejectPending(record.id)}>Recusar</Button>
                    <Button size="sm" className="bg-green-600 rounded-lg" onClick={() => handleApprovePending(record.id)}>Aprovar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* HISTÓRICO PRINCIPAL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Saúde
          </h2>
          <Badge variant="secondary" className="rounded-full">{records?.length || 0} registros</Badge>
        </div>

        {!records || records.length === 0 ? (
          <Card className="border-dashed rounded-2xl py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum registro encontrado.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {records.map((record) => {
              const typeInfo = recordTypeMap[record.record_type] || { label: 'Outro', icon: FileText, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
              const Icon = typeInfo.icon;
              const isExpanded = expandedRecords[record.id];

              return (
                <Card 
                  key={record.id} 
                  className={cn(
                    "overflow-hidden transition-all duration-200 rounded-2xl border-l-4 cursor-pointer hover:shadow-sm", 
                    typeInfo.borderColor,
                    isExpanded ? "ring-1 ring-primary/10" : ""
                  )}
                  onClick={() => toggleExpand(record.id)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center p-4 gap-4">
                      <div className={cn("p-3 rounded-xl shrink-0", typeInfo.bgColor, typeInfo.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-sm text-gray-900 truncate">{record.title}</h3>
                          <span className="text-[10px] font-medium text-muted-foreground shrink-0 ml-2">
                            {format(new Date(record.record_date), "dd/MM/yy")}
                          </span>
                        </div>
                        
                        {/* RESUMO PEQUENO (Sempre visível) */}
                        <div className="flex items-center gap-3 mt-1">
                          <span className={cn("text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-white border", typeInfo.color, typeInfo.borderColor)}>
                            {typeInfo.label}
                          </span>
                          {record.professional_name && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                              Dr. {record.professional_name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-muted-foreground/40">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {/* CONTEÚDO EXPANSÍVEL (Resumo detalhado) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-muted/30 rounded-xl p-3 border border-muted/50 space-y-3">
                          {record.observation ? (
                            <div className="flex gap-2">
                              <Info size={14} className="text-primary shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-700 leading-relaxed">{record.observation}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Sem observações adicionais.</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-muted">
                            {record.attachment_url && (
                              <Button variant="link" size="sm" className="h-auto p-0 text-[11px] gap-1" asChild onClick={(e) => e.stopPropagation()}>
                                <a href={record.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink size={12} /> Ver Anexo
                                </a>
                              </Button>
                            )}
                            
                            {isGuardian && (
                              <div className="flex gap-2 ml-auto">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] rounded-lg" onClick={(e) => { e.stopPropagation(); handleOpenForm(record); }}>
                                  <Edit size={12} className="mr-1" /> Editar
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-red-500 hover:text-red-600 rounded-lg" onClick={(e) => { e.stopPropagation(); }}>
                                  <Trash2 size={12} className="mr-1" /> Excluir
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthRecordsPage;
