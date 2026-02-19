import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Calendar, 
  BarChart3, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Phone,
  Stethoscope,
  ChevronRight,
  Activity,
  AlertCircle,
  History,
  TrendingUp,
  DollarSign,
  Star,
  UserCheck,
  QrCode,
  ExternalLink,
  Settings,
  FileText,
  Plus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTranslation } from "react-i18next";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ServiceRequest {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_avatar: string | null;
  guardian_name: string;
  service_type: string;
  message: string;
  status: string;
  created_at: string;
  phone?: string;
}

interface ClientPet {
  id: string;
  name: string;
  avatar_url: string | null;
  breed: string;
  species: string;
  guardian_name: string;
  access_status: 'pending' | 'granted' | 'revoked';
}

const ProfessionalDashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [clients, setClients] = useState<ClientPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEvolutionDialogOpen, setIsEvolutionDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [evolutionNote, setEvolutionNote] = useState("");
  const [isSavingEvolution, setIsSavingEvolution] = useState(false);

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedServices: 0,
    averageRating: 0,
    totalClients: 0,
    estimatedRevenue: 0
  });

  useEffect(() => {
    if (user && profile?.account_type === 'professional') {
      fetchDashboardData();
    }
  }, [user, profile]);

  if (authLoading || profileLoading) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.account_type !== 'professional') {
    return <Navigate to="/feed" replace />;
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select(`
          *,
          pet:pet_id(name, avatar_url, guardian_name)
        `)
        .eq('professional_id', user?.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      const formattedRequests = requestsData.map((req: any) => ({
        id: req.id,
        pet_id: req.pet_id,
        pet_name: req.pet?.name || "Pet Removido",
        pet_avatar: req.pet?.avatar_url,
        guardian_name: req.pet?.guardian_name || "N/A",
        service_type: req.service_type,
        message: req.message,
        status: req.status,
        created_at: req.created_at,
      }));

      setRequests(formattedRequests);

      const { data: accessData, error: accessError } = await supabase
        .from('health_access_status')
        .select(`
          status,
          pet:pet_id(id, name, avatar_url, breed, species, guardian_name)
        `)
        .eq('professional_user_id', user?.id);

      if (accessError) throw accessError;

      const formattedClients = accessData.map((acc: any) => ({
        id: acc.pet?.id,
        name: acc.pet?.name || "Pet Removido",
        avatar_url: acc.pet?.avatar_url,
        breed: acc.pet?.breed || "N/A",
        species: acc.pet?.species || "N/A",
        guardian_name: acc.pet?.guardian_name || "N/A",
        access_status: acc.status,
      })).filter(c => c.id);

      setClients(formattedClients);

      const { data: reviewsData } = await supabase
        .from('service_reviews')
        .select('rating')
        .eq('professional_id', user?.id);
      
      const avgRating = reviewsData && reviewsData.length > 0 
        ? reviewsData.reduce((acc, curr) => acc + curr.rating, 0) / reviewsData.length 
        : 0;

      const completed = formattedRequests.filter(r => r.status === 'completed').length;
      setStats({
        totalRequests: formattedRequests.length,
        pendingRequests: formattedRequests.filter(r => r.status === 'pending').length,
        completedServices: completed,
        averageRating: Number(avgRating.toFixed(1)),
        totalClients: formattedClients.length,
        estimatedRevenue: completed * 150
      });

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast.error(t("common.error_loading_data"));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'accepted' | 'rejected' | 'completed') => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      if (action === 'completed') {
        setSelectedRequestId(requestId);
        setIsEvolutionDialogOpen(true);
        return;
      }

      const { error } = await supabase
        .from('service_requests')
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('notifications').insert({
        pet_id: request.pet_id,
        type: 'message',
        message: `Seu serviço para ${request.pet_name} foi ${action === 'accepted' ? 'aceito' : 'recusado'} por ${profile?.full_name}`,
        related_user_id: user?.id,
        is_read: false
      });

      toast.success(t(`common.success_action_${action}`));
      fetchDashboardData();
    } catch (error) {
      console.error("Erro ao atualizar solicitação:", error);
      toast.error(t("common.error_action"));
    }
  };

  const handleSaveEvolution = async () => {
    if (!selectedRequestId || !evolutionNote.trim()) return;
    
    setIsSavingEvolution(true);
    try {
      const request = requests.find(r => r.id === selectedRequestId);
      if (!request) return;

      // 1. Atualizar status do serviço
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', selectedRequestId);

      if (updateError) throw updateError;

      // 2. Adicionar registro de saúde (Evolução)
      const { error: healthError } = await supabase
        .from('health_records')
        .insert({
          pet_id: request.pet_id,
          type: 'check_up',
          observation: evolutionNote,
          professional_name: profile?.full_name,
          created_at: new Date().toISOString()
        });

      if (healthError) throw healthError;

      // 3. Notificar o tutor
      await supabase.from('notifications').insert({
        pet_id: request.pet_id,
        type: 'message',
        message: `Serviço concluído para ${request.pet_name}. Uma nova nota de evolução foi adicionada ao prontuário.`,
        related_user_id: user?.id,
        is_read: false
      });

      toast.success(t("menu.professional_evolution_success"));
      setIsEvolutionDialogOpen(false);
      setEvolutionNote("");
      setSelectedRequestId(null);
      fetchDashboardData();
    } catch (error) {
      console.error("Erro ao salvar evolução:", error);
      toast.error(t("menu.professional_evolution_error"));
    } finally {
      setIsSavingEvolution(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Aceito</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Concluído</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Recusado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-7xl py-8 px-4">
        {/* Header com Status de Disponibilidade */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-primary/10 shadow-sm">
              <AvatarImage src={profile?.professional_avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-white text-xl font-bold">
                {profile?.full_name?.[0] || 'P'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">{t("menu.professional_dashboard")}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-green-500 hover:bg-green-600 text-white border-none px-2 py-0.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  {t("menu.professional_available")}
                </Badge>
                <span className="text-muted-foreground text-sm font-medium">• {profile?.full_name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Button variant="outline" className="flex-1 lg:flex-none gap-2 font-semibold" onClick={() => navigate("/professional-profile")}>
              <Settings className="h-4 w-4" />
              {t("menu.professional_edit_profile")}
            </Button>
            <Button className="flex-1 lg:flex-none gap-2 gradient-bg shadow-md font-semibold" onClick={() => navigate(`/professional/${user?.id}`)}>
              <ExternalLink className="h-4 w-4" />
              {t("menu.professional_my_profile")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Principal - Gestão de Atendimentos */}
          <div className="lg:col-span-8 space-y-8">
            <Tabs defaultValue="appointments" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="appointments" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    {t("menu.professional_next_appointments")}
                  </TabsTrigger>
                  <TabsTrigger value="clients" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    {t("menu.professional_clients")}
                  </TabsTrigger>
                </TabsList>
                <Badge variant="secondary" className="font-bold px-3 py-1">
                  {stats.pendingRequests} Pendentes
                </Badge>
              </div>

              <TabsContent value="appointments" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {requests.filter(r => r.status === 'pending' || r.status === 'accepted').length === 0 ? (
                  <Card className="border-dashed bg-muted/20">
                    <CardContent className="py-16 text-center">
                      <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Calendar className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <h3 className="font-bold text-lg text-foreground/70">{t("menu.professional_no_appointments")}</h3>
                      <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">Suas novas solicitações de serviço aparecerão aqui.</p>
                    </CardContent>
                  </Card>
                ) : (
                  requests.filter(r => r.status === 'pending' || r.status === 'accepted').map((request) => (
                    <Card key={request.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          <div className="p-6 flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <Avatar className="h-14 w-14 border-2 border-primary/10">
                                    <AvatarImage src={request.pet_avatar || undefined} />
                                    <AvatarFallback className="bg-primary/5 text-primary font-bold">{request.pet_name[0]}</AvatarFallback>
                                  </Avatar>
                                  {request.status === 'accepted' && (
                                    <div className="absolute -top-1 -right-1 bg-blue-500 border-2 border-white w-5 h-5 rounded-full flex items-center justify-center">
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-black text-xl leading-none mb-1 group-hover:text-primary transition-colors">{request.pet_name}</h3>
                                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                                    <UserCheck className="h-3 w-3" /> {request.guardian_name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(request.status)}
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-2">
                                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                              <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Stethoscope className="h-4 w-4 text-primary" />
                                  <span className="text-xs font-black uppercase tracking-tighter text-muted-foreground">Serviço Solicitado</span>
                                </div>
                                <p className="font-bold text-foreground">{request.service_type}</p>
                              </div>
                              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                  <span className="text-xs font-black uppercase tracking-tighter text-muted-foreground">Mensagem do Tutor</span>
                                </div>
                                <p className="text-sm italic text-foreground/80 line-clamp-2">"{request.message}"</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-muted/10 p-6 flex flex-row md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-border/50 min-w-[220px]">
                            {request.status === 'pending' ? (
                              <>
                                <Button 
                                  className="flex-1 gradient-bg shadow-md font-bold" 
                                  onClick={() => handleRequestAction(request.id, 'accepted')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aceitar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="flex-1 font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                                  onClick={() => handleRequestAction(request.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Recusar
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md font-bold" 
                                  onClick={() => handleRequestAction(request.id, 'completed')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Finalizar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="flex-1 font-bold gap-2"
                                  onClick={() => navigate(`/pet/${request.pet_id}/health`)}
                                >
                                  <FileText className="h-4 w-4" />
                                  {t("menu.professional_view_medical_file")}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="flex-1 font-bold gap-2"
                                  onClick={() => navigate(`/chat`)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Chat
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="clients" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clients.length === 0 ? (
                    <Card className="md:col-span-2 border-dashed bg-muted/20">
                      <CardContent className="py-16 text-center">
                        <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-bold">Você ainda não possui clientes com acesso autorizado.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    clients.map((client) => (
                      <Card key={client.id} className="hover:shadow-md transition-all cursor-pointer group border-none shadow-sm" onClick={() => navigate(`/pet/${client.id}/health`)}>
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                              <AvatarImage src={client.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/5 text-primary font-bold text-xl">{client.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-lg truncate group-hover:text-primary transition-colors">{client.name}</h3>
                              <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">{client.species} • {client.breed}</p>
                              <div className="flex items-center gap-1.5 mt-2 py-1 px-2 bg-muted rounded-lg w-fit">
                                <UserCheck className="h-3 w-3 text-primary" />
                                <p className="text-[10px] font-black text-foreground/70 truncate uppercase">{client.guardian_name}</p>
                              </div>
                            </div>
                            <div className="bg-primary/5 p-2 rounded-full group-hover:bg-primary group-hover:text-white transition-all">
                              <ChevronRight className="h-5 w-5" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Histórico Recente */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    {t("menu.professional_history")}
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="font-bold text-primary" onClick={() => {}}>Ver Tudo</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {requests.filter(r => r.status === 'completed').slice(0, 5).length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground font-medium italic">
                      Nenhum histórico de atendimento concluído.
                    </div>
                  ) : (
                    requests.filter(r => r.status === 'completed').slice(0, 5).map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border border-primary/10">
                            <AvatarImage src={req.pet_avatar || undefined} />
                            <AvatarFallback className="bg-muted text-xs font-bold">{req.pet_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-black text-foreground">{req.pet_name}</p>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">{req.service_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 text-[10px] font-bold uppercase">Concluído</Badge>
                          <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                            {new Date(req.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral - Métricas e Ações Rápidas */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card de Receita e Meta */}
            <Card className="border-none shadow-lg bg-primary text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <TrendingUp size={120} />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-primary-foreground/80 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t("menu.professional_revenue")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black tracking-tighter mb-6">
                  R$ {stats.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase tracking-tighter">
                    <span>{t("menu.professional_monthly_goal")}</span>
                    <span>{Math.round((stats.completedServices / 10) * 100)}%</span>
                  </div>
                  <Progress value={(stats.completedServices / 10) * 100} className="h-2 bg-white/20" />
                  <p className="text-[10px] text-primary-foreground/60 font-bold italic">Baseado em {stats.completedServices} atendimentos este mês.</p>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  {t("menu.professional_quick_actions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                  <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">{t("menu.professional_share_qr")}</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all group" onClick={() => navigate("/chat")}>
                  <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Chat</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                  <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Novo Registro</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all group" onClick={() => navigate("/professional-profile")}>
                  <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <Settings className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">Ajustes</span>
                </Button>
              </CardContent>
            </Card>

            {/* Estatísticas Rápidas */}
            <Card className="border-none shadow-sm bg-muted/30">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">{t("menu.professional_active_clients")}</span>
                  </div>
                  <span className="text-xl font-black">{stats.totalClients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">{t("menu.professional_average_rating")}</span>
                  </div>
                  <span className="text-xl font-black">{stats.averageRating > 0 ? stats.averageRating : "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">{t("menu.professional_completed_services")}</span>
                  </div>
                  <span className="text-xl font-black">{stats.completedServices}</span>
                </div>
              </CardContent>
            </Card>

            {/* Mensagens Recentes */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t("menu.professional_recent_messages")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-6 text-muted-foreground text-xs font-medium italic">
                    {t("menu.professional_no_messages")}
                  </div>
                  <Button variant="link" className="w-full text-xs font-black uppercase tracking-tighter text-primary" onClick={() => navigate("/chat")}>
                    Ir para o Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Diálogo de Evolução Clínica */}
      <Dialog open={isEvolutionDialogOpen} onOpenChange={setIsEvolutionDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" />
              {t("menu.professional_evolution_note")}
            </DialogTitle>
            <DialogDescription className="font-medium">
              Finalize o atendimento registrando a evolução clínica do paciente. Isso ficará salvo no prontuário do pet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Textarea
              placeholder={t("menu.professional_evolution_placeholder")}
              className="min-h-[150px] rounded-2xl border-muted bg-muted/20 focus:ring-primary/20 p-4 font-medium"
              value={evolutionNote}
              onChange={(e) => setEvolutionNote(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setIsEvolutionDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              className="gradient-bg shadow-md font-bold rounded-xl px-8" 
              onClick={handleSaveEvolution}
              disabled={isSavingEvolution || !evolutionNote.trim()}
            >
              {isSavingEvolution ? t("common.saving") : t("menu.professional_save_evolution")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ProfessionalDashboard;
