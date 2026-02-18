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
  UserCheck
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTranslation } from "react-i18next";

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
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedServices: 0,
    averageRating: 0,
    totalClients: 0,
    estimatedRevenue: 0
  });

  useEffect(() => {
    // Garantir que a sessão está ativa e o perfil carregado
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

      const { error } = await supabase
        .from('service_requests')
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('notifications').insert({
        pet_id: request.pet_id,
        type: 'message',
        message: `Seu serviço para ${request.pet_name} foi ${action === 'accepted' ? 'aceito' : action === 'rejected' ? 'recusado' : 'concluído'} por ${profile?.full_name}`,
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
      <div className="container max-w-6xl py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("menu.professional_panel")}</h1>
            <p className="text-muted-foreground">
              {t("common.welcome_back")}, {profile?.full_name}. Gerencie seus atendimentos e clientes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/professional-profile")}>
              {t("common.edit_profile")}
            </Button>
            <Button size="sm" onClick={() => navigate(`/professional/${user?.id}`)}>
              {t("common.see_public_profile")}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">Pets com acesso autorizado</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Aguardando resposta</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedServices}</div>
              <p className="text-xs text-muted-foreground">Histórico total</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating > 0 ? stats.averageRating : "N/A"}</div>
              <p className="text-xs text-muted-foreground">Média geral</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px] bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="requests" className="rounded-lg">Solicitações</TabsTrigger>
            <TabsTrigger value="clients" className="rounded-lg">Meus Clientes</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg">Histórico</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg">Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4 animate-in fade-in duration-300">
            <div className="grid gap-4">
              {requests.filter(r => r.status === 'pending' || r.status === 'accepted').length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma solicitação ativa no momento.</p>
                  </CardContent>
                </Card>
              ) : (
                requests.filter(r => r.status === 'pending' || r.status === 'accepted').map((request) => (
                  <Card key={request.id} className="overflow-hidden hover:border-primary/30 transition-colors">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-6 flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <Avatar className="h-14 w-14 border-2 border-primary/10">
                              <AvatarImage src={request.pet_avatar || undefined} />
                              <AvatarFallback>{request.pet_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg leading-none mb-1">{request.pet_name}</h3>
                              <p className="text-sm text-muted-foreground">Guardião: {request.guardian_name}</p>
                            </div>
                            <div className="hidden sm:block">
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="p-1.5 bg-primary/10 rounded-md">
                                <Stethoscope className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-semibold text-foreground/80">Serviço: {request.service_type}</span>
                            </div>
                            <div className="bg-muted/40 p-4 rounded-xl text-sm italic text-foreground/70 relative">
                              <span className="absolute top-2 left-2 text-primary/20 text-4xl leading-none">"</span>
                              {request.message}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                              <Clock className="h-3 w-3" />
                              Recebida {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-muted/20 p-6 flex flex-row md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-border/50 min-w-[180px]">
                          {request.status === 'pending' ? (
                            <>
                              <Button 
                                className="flex-1 gradient-bg shadow-sm" 
                                size="sm"
                                onClick={() => handleRequestAction(request.id, 'accepted')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aceitar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                                onClick={() => handleRequestAction(request.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Recusar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm" 
                                size="sm"
                                onClick={() => handleRequestAction(request.id, 'completed')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Finalizar Atendimento
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => navigate(`/chat`)}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Abrir Chat
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4 animate-in fade-in duration-300">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clients.length === 0 ? (
                <Card className="md:col-span-3 border-dashed">
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground">Você ainda não possui clientes com acesso autorizado.</p>
                  </CardContent>
                </Card>
              ) : (
                clients.map((client) => (
                  <Card key={client.id} className="hover:shadow-lg transition-all cursor-pointer group border-primary/5 hover:border-primary/20" onClick={() => navigate(`/pet/${client.id}/health`)}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-16 w-16 border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                            <AvatarImage src={client.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/5 text-primary font-bold text-xl">{client.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white w-4 h-4 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{client.name}</h3>
                          <p className="text-xs text-muted-foreground truncate font-medium uppercase tracking-tighter">{client.species} • {client.breed}</p>
                          <div className="flex items-center gap-1.5 mt-2 py-1 px-2 bg-muted rounded-md w-fit">
                            <UserCheck className="h-3 w-3 text-primary" />
                            <p className="text-[10px] font-bold text-foreground/70 truncate uppercase">{client.guardian_name}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="animate-in fade-in duration-300">
            <Card className="border-none shadow-sm bg-muted/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  Histórico de Atendimentos
                </CardTitle>
                <CardDescription>Veja todos os serviços realizados anteriormente.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requests.filter(r => r.status === 'completed' || r.status === 'rejected').length === 0 ? (
                    <div className="text-center py-12 bg-background rounded-xl border border-dashed">
                       <History className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                       <p className="text-muted-foreground text-sm">Nenhum histórico disponível.</p>
                    </div>
                  ) : (
                    requests.filter(r => r.status === 'completed' || r.status === 'rejected').map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border border-primary/10">
                            <AvatarImage src={req.pet_avatar || undefined} />
                            <AvatarFallback className="bg-muted text-xs">{req.pet_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-foreground">{req.pet_name}</p>
                            <p className="text-xs text-muted-foreground font-medium">{req.service_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(req.status)}
                          <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-widest">
                            {new Date(req.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="animate-in fade-in duration-300">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    Desempenho Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex flex-col items-center justify-center border-t bg-muted/5 rounded-b-xl">
                  <Activity className="h-12 w-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground text-sm font-medium">Gráfico de atendimentos em breve</p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase mt-2">Estamos processando seus dados</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    Receita Estimada
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-4xl font-black text-primary tracking-tight">
                    R$ {stats.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">Baseado em serviços concluídos (valor médio R$ 150,00)</p>
                  
                  <div className="mt-8 space-y-4">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-muted-foreground">Serviços Concluídos</span>
                      <span className="text-foreground">{stats.completedServices}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.completedServices / 10) * 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">Meta de Atendimento Mensal</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ProfessionalDashboard;
