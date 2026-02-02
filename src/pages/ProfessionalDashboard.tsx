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
  Star
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";

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
    if (user && profile?.account_type === 'professional') {
      fetchDashboardData();
    }
  }, [user, profile]);

  if (authLoading || profileLoading) {
    return <LoadingScreen message="Carregando painel..." />;
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
      
      // 1. Buscar solicitações de serviço reais
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

      // 2. Buscar clientes reais (pets com acesso concedido)
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
      })).filter(c => c.id); // Remove nulos se o pet foi deletado

      setClients(formattedClients);

      // 3. Buscar avaliações reais para média
      const { data: reviewsData } = await supabase
        .from('service_reviews')
        .select('rating')
        .eq('professional_id', user?.id);
      
      const avgRating = reviewsData && reviewsData.length > 0 
        ? reviewsData.reduce((acc, curr) => acc + curr.rating, 0) / reviewsData.length 
        : 0;

      // 4. Calcular estatísticas reais
      const completed = formattedRequests.filter(r => r.status === 'completed').length;
      setStats({
        totalRequests: formattedRequests.length,
        pendingRequests: formattedRequests.filter(r => r.status === 'pending').length,
        completedServices: completed,
        averageRating: Number(avgRating.toFixed(1)),
        totalClients: formattedClients.length,
        estimatedRevenue: completed * 150 // Valor médio fictício por serviço concluído
      });

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast.error("Erro ao carregar dados reais do dashboard");
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

      // Criar notificação para o guardião (pet)
      await supabase.from('notifications').insert({
        pet_id: request.pet_id,
        type: 'message',
        message: `Sua solicitação para ${request.pet_name} foi ${action === 'accepted' ? 'aceita' : action === 'rejected' ? 'recusada' : 'concluída'} por ${profile?.full_name}`,
        related_user_id: user?.id,
        is_read: false
      });

      toast.success(`Solicitação ${action === 'accepted' ? 'aceita' : action === 'rejected' ? 'recusada' : 'concluída'} com sucesso!`);
      fetchDashboardData();
    } catch (error) {
      console.error("Erro ao atualizar solicitação:", error);
      toast.error("Erro ao processar solicitação");
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
            <h1 className="text-3xl font-bold tracking-tight">Painel do Profissional</h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta, {profile?.full_name}. Gerencie seus atendimentos e clientes com dados reais.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/professional-profile">
              <Button variant="outline" size="sm">Editar Perfil</Button>
            </Link>
            <Link to={`/professional/${user?.id}`}>
              <Button size="sm">Ver Perfil Público</Button>
            </Link>
          </div>
        </div>

        {/* Cards de Resumo com Dados Reais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">Pets com acesso autorizado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Aguardando sua resposta</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedServices}</div>
              <p className="text-xs text-muted-foreground">Histórico total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating > 0 ? stats.averageRating : "N/A"}</div>
              <p className="text-xs text-muted-foreground">Baseado em avaliações reais</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="requests" className="relative">
              Solicitações
              {stats.pendingRequests > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {stats.pendingRequests}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="clients">Meus Clientes</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <div className="grid gap-4">
              {requests.filter(r => r.status === 'pending' || r.status === 'accepted').length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma solicitação ativa no momento.</p>
                  </CardContent>
                </Card>
              ) : (
                requests.filter(r => r.status === 'pending' || r.status === 'accepted').map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-6 flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={request.pet_avatar || undefined} />
                              <AvatarFallback>{request.pet_name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-bold text-lg">{request.pet_name}</h3>
                              <p className="text-sm text-muted-foreground">Guardião: {request.guardian_name}</p>
                            </div>
                            <div className="ml-auto">
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Stethoscope className="h-4 w-4 text-primary" />
                              <span className="font-medium">Serviço: {request.service_type}</span>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg text-sm italic">
                              "{request.message}"
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Recebida {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-muted/30 p-6 flex flex-row md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-border">
                          {request.status === 'pending' ? (
                            <>
                              <Button 
                                className="flex-1 gradient-bg" 
                                size="sm"
                                onClick={() => handleRequestAction(request.id, 'accepted')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aceitar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRequestAction(request.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Recusar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700" 
                                size="sm"
                                onClick={() => handleRequestAction(request.id, 'completed')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Concluir
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => navigate(`/chat/pet/${request.pet_id}`)}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
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
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {clients.length === 0 ? (
                <Card className="md:col-span-2">
                  <CardContent className="py-10 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Você ainda não possui clientes com acesso autorizado.</p>
                  </CardContent>
                </Card>
              ) : (
                clients.map((client) => (
                  <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/pet/${client.id}/health`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-primary/10">
                          <AvatarImage src={client.avatar_url || undefined} />
                          <AvatarFallback>{client.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate">{client.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{client.species} • {client.breed}</p>
                          <p className="text-xs font-medium mt-1">Guardião: {client.guardian_name}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Histórico de Atendimentos
                </CardTitle>
                <CardDescription>Veja todos os serviços realizados anteriormente.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.filter(r => r.status === 'completed' || r.status === 'rejected').length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground">Nenhum histórico disponível.</p>
                  ) : (
                    requests.filter(r => r.status === 'completed' || r.status === 'rejected').map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={req.pet_avatar || undefined} />
                            <AvatarFallback>{req.pet_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold">{req.pet_name}</p>
                            <p className="text-xs text-muted-foreground">{req.service_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(req.status)}
                          <p className="text-[10px] text-muted-foreground mt-1">
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

          <TabsContent value="stats">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Desempenho Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center border-t">
                  <p className="text-muted-foreground text-sm">Gráfico de atendimentos em breve</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Receita Estimada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    R$ {stats.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Baseado em serviços concluídos (valor médio R$ 150,00)</p>
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Serviços Concluídos</span>
                      <span className="font-bold">{stats.completedServices}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
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
