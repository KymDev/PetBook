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
  History
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, Navigate } from "react-router-dom";
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
  last_record?: {
    type: string;
    date: string;
  };
}

const ProfessionalDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [clients, setClients] = useState<ClientPet[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      // 1. Buscar solicitações de serviço
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
        pet_name: req.pet.name,
        pet_avatar: req.pet.avatar_url,
        guardian_name: req.pet.guardian_name,
        service_type: req.service_type,
        message: req.message,
        status: req.status,
        created_at: req.created_at,
      }));

      setRequests(formattedRequests);

      // 2. Buscar clientes (pets com acesso concedido ou solicitações aceitas)
      const { data: accessData, error: accessError } = await supabase
        .from('health_access_status')
        .select(`
          status,
          pet:pet_id(id, name, avatar_url, breed, species, guardian_name)
        `)
        .eq('professional_user_id', user?.id);

      if (accessError) throw accessError;

      const formattedClients = accessData.map((acc: any) => ({
        id: acc.pet.id,
        name: acc.pet.name,
        avatar_url: acc.pet.avatar_url,
        breed: acc.pet.breed,
        species: acc.pet.species,
        guardian_name: acc.pet.guardian_name,
        access_status: acc.status,
      }));

      setClients(formattedClients);

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aceito</Badge>;
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
              Bem-vindo de volta, {profile?.full_name}. Gerencie seus atendimentos e clientes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Agenda
            </Button>
            <Link to="/professional/profile">
              <Button size="sm">Ver Perfil Público</Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="requests" className="relative">
              Solicitações
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="schedule">Agenda</TabsTrigger>
            <TabsTrigger value="analytics">Estatísticas</TabsTrigger>
          </TabsList>

          {/* Solicitações */}
          <TabsContent value="requests" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">Nenhuma solicitação</h3>
                  <p className="text-muted-foreground">Você ainda não recebeu solicitações de serviço.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {requests.map((request) => (
                  <Card key={request.id} className="overflow-hidden border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={request.pet_avatar || undefined} />
                            <AvatarFallback>{request.pet_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{request.pet_name}</CardTitle>
                            <CardDescription>Guardião: {request.guardian_name}</CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-1">Serviço solicitado:</p>
                        <Badge variant="secondary">{request.service_type}</Badge>
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold mb-1">Mensagem:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{request.message}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(request.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                        <Button variant="ghost" size="sm" className="h-8">
                          Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Clientes - NOVA IMPLEMENTAÇÃO COM FOCO EM SAÚDE */}
          <TabsContent value="clients" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : clients.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">Nenhum cliente</h3>
                  <p className="text-muted-foreground">Sua lista de clientes aparecerá aqui após aceitar solicitações.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {clients.map((client) => (
                  <Card key={client.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Info Básica */}
                        <div className="p-6 flex items-center gap-4 md:w-1/3 border-b md:border-b-0 md:border-r">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={client.avatar_url || undefined} />
                            <AvatarFallback>{client.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-bold text-lg">{client.name}</h3>
                            <p className="text-sm text-muted-foreground">{client.species} • {client.breed}</p>
                            <p className="text-xs text-muted-foreground mt-1">Tutor: {client.guardian_name}</p>
                          </div>
                        </div>

                        {/* Resumo de Saúde Contextual (Simulado para a demo) */}
                        <div className="p-6 flex-1 bg-secondary/5">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">Resumo Contextual (Últimos 30 dias)</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-start gap-2">
                              <div className="mt-1 p-1 bg-green-100 rounded">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium">Energia/Apetite</p>
                                <p className="text-[10px] text-muted-foreground">Estável e dentro do normal</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="mt-1 p-1 bg-blue-100 rounded">
                                <History className="h-3 w-3 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium">Último Evento</p>
                                <p className="text-[10px] text-muted-foreground">Vacina V10 aplicada há 12 dias</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="p-6 flex items-center justify-center md:w-1/4 gap-2">
                          {client.access_status === 'granted' ? (
                            <Link to={`/pet/${client.id}/health`} className="w-full">
                              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                <Stethoscope className="h-4 w-4 mr-2" />
                                Ficha de Saúde
                              </Button>
                            </Link>
                          ) : (
                            <Button variant="outline" className="w-full" disabled>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Acesso Pendente
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Agenda */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Agenda de Atendimentos</CardTitle>
                <CardDescription>Seus compromissos agendados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Funcionalidade de agenda em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estatísticas */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas e Desempenho</CardTitle>
                <CardDescription>Análise dos seus serviços</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Estatísticas detalhadas em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ProfessionalDashboard;
