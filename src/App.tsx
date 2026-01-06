import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PetProvider, usePet } from "@/contexts/PetContext";
import { UserProfileProvider, useUserProfile } from "@/contexts/UserProfileContext";

import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import CreatePet from "./pages/CreatePet";
import CreatePost from "./pages/CreatePost";
import PetProfile from "./pages/PetProfile";
import Chat from "./pages/Chat";
import ChatRoom from "./pages/ChatRoom";
import Communities from "./pages/Communities";
import Notifications from "./pages/Notifications";
import Explore from "./pages/Explore";
import ServiceProvidersPage from "./pages/ServiceProvidersPage";
import ProfessionalProfile from "./pages/ProfessionalProfile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AuthConfirm from "./pages/AuthConfirm";
import Index from "./pages/Index";
import LoadingPage from "./pages/LoadingPage";
import StoryViewer from "./pages/StoryViewer";
import CreateStory from "./pages/CreateStory";
import SignupChoice from "./pages/SignupChoice";
import ProfessionalSignup from "./pages/ProfessionalSignup";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import EditPet from "./pages/EditPet"; // Importar o novo componente

// NOVO: Importação do componente de Registros de Saúde
import HealthRecordsPage from "./components/HealthRecords/HealthRecordsPage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./integrations/supabase/client";
import { Database } from "./integrations/supabase/types";

// --- Componente Wrapper para Registros de Saúde ---
// Este componente extrai o petId da URL e busca o nome do pet para passar ao HealthRecordsPage
const HealthRecordsWrapper = () => {
  const { petId } = useParams<{ petId: string }>();

  // Busca o nome do pet usando o petId
  const { data: pet, isLoading } = useQuery({
    queryKey: ['petName', petId],
    queryFn: async () => {
      if (!petId) return null;
      const { data, error } = await supabase
        .from('pets')
        .select('name')
        .eq('id', petId)
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!petId,
  });

  if (isLoading) return <LoadingPage />;
  if (!petId || !pet) return <NotFound />; // Se o petId não existir ou o pet não for encontrado

  return <HealthRecordsPage petId={petId} petName={pet.name} />;
};


// --- Componente de redirecionamento raiz ---
const RootRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const { myPets, loading: petLoading } = usePet();
  const { profile, loading: profileLoading } = useUserProfile();

  if (authLoading || petLoading || profileLoading) return <LoadingPage />;

  if (!user) return <Navigate to="/auth" replace />;

  // CORREÇÃO DA RACE CONDITION: Se o usuário está logado, mas o perfil ainda é null,
  // significa que o carregamento assíncrono do perfil ainda não terminou (ou falhou).
  // O UserProfileContext garante que um perfil seja criado, então esperamos o objeto 'profile' existir.
  if (!profile) return <LoadingPage />;

  // Se o tipo de conta não foi definido, ir para signup-choice.
  if (!profile.account_type) {
    return <Navigate to="/signup-choice" replace />;
  }

  // Lógica de Redirecionamento Pós-Login
  if (profile.account_type === 'professional') {
    // Se for profissional e o perfil estiver completo, vai para o dashboard
    if (profile.professional_bio) {
      return <Navigate to="/professional-dashboard" replace />;
    }
    // Se não estiver completo, vai para o signup profissional
    return <Navigate to="/professional-signup" replace />;
  }

  if (profile.account_type === 'user') {
    // Se é guardião e tem pet, vai para o feed
    if (myPets.length > 0) {
      return <Navigate to="/feed" replace />;
    }
    // Se é guardião e não tem pet, vai para criar pet
    return <Navigate to="/create-pet" replace />;
  }

  // Fallback (não deve acontecer se o account_type estiver definido)
  return <Navigate to="/signup-choice" replace />;
};

const queryClient = new QueryClient();

// --- Componente de rota protegida (requer autenticação) ---
const AuthRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <LoadingPage />;

  if (!user) return <Navigate to="/auth" replace />;

  return children;
};

// --- Componente de rota protegida (requer autenticação + pet) ---
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading: authLoading } = useAuth();
  const { myPets, loading: petLoading } = usePet();
  const { profile, loading: profileLoading } = useUserProfile();

  if (authLoading || petLoading || profileLoading) return <LoadingPage />;

  if (!user) return <Navigate to="/auth" replace />;

  // Se não escolheu tipo de conta, ir para signup-choice
  if (!profile || !profile.account_type) {
    // Se o usuário está logado, mas o perfil ainda não carregou ou o account_type não está definido,
    // o RootRedirect deve ter tratado o caso inicial. Se chegamos aqui, algo está errado.
    // Vamos redirecionar para a escolha de conta, onde o usuário pode forçar a definição.
    return <Navigate to="/signup-choice" replace />;
  }

  // Se é profissional, pode acessar qualquer rota
  if (profile.account_type === 'professional') return children;

  // Se é guardião e não tem pet, e não está na página de criar pet, ir para create-pet
  if (myPets.length === 0 && window.location.pathname !== '/create-pet') {
    return <Navigate to="/create-pet" replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* Auth */}
    <Route path="/auth" element={<Auth />} />
    <Route path="/auth/confirm" element={<AuthConfirm />} />
    <Route path="/signup-choice" element={<AuthRoute><SignupChoice /></AuthRoute>} />
    <Route path="/professional-signup" element={<AuthRoute><ProfessionalSignup /></AuthRoute>} />

    {/* NOVA ROTA: Diretório de Serviços */}
    <Route
      path="/services"
      element={
        <ProtectedRoute>
          <ServiceProvidersPage />
        </ProtectedRoute>
      }
    />

    {/* NOVA ROTA: Perfil Profissional */}
    <Route
      path="/professional-profile"
      element={
        <ProtectedRoute>
          <ProfessionalProfile />
        </ProtectedRoute>
      }
    />

    {/* NOVA ROTA: Painel de Atendimento Profissional */}
    <Route
      path="/professional-dashboard"
      element={
        <ProtectedRoute>
          <ProfessionalDashboard />
        </ProtectedRoute>
      }
    />

    {/* Criação inicial de pet */}
    <Route
      path="/create-pet"
      element={
        <ProtectedRoute>
          <CreatePet />
        </ProtectedRoute>
      }
    />

    {/* App interno protegido */}
    <Route
      path="/feed"
      element={
        <ProtectedRoute>
          <Feed />
        </ProtectedRoute>
      }
    />
    <Route
      path="/create-post"
      element={
        <ProtectedRoute>
          <CreatePost />
        </ProtectedRoute>
      }
    />
    <Route
      path="/create-story"
      element={
        <ProtectedRoute>
          <CreateStory />
        </ProtectedRoute>
      }
    />
    <Route
      path="/story/:id"
      element={
        <ProtectedRoute>
          <StoryViewer />
        </ProtectedRoute>
      }
    />
	    <Route
	      path="/pet/:petId" // Alterado de /pet/:id para /pet/:petId para consistência com o novo HealthRecordsWrapper
	      element={
	        <ProtectedRoute>
	          <PetProfile />
	        </ProtectedRoute>
	      }
	    />
	    
	    {/* NOVA ROTA: Edição de Pet */}
	    <Route
	      path="/edit-pet/:petId"
	      element={
	        <ProtectedRoute>
	          <EditPet />
	        </ProtectedRoute>
	      }
	    />
    
    {/* NOVA ROTA: Registros de Saúde */}
    <Route
      path="/pets/:petId/saude"
      element={
        <ProtectedRoute>
          <HealthRecordsWrapper />
        </ProtectedRoute>
      }
    />

    <Route
      path="/chat"
      element={
        <ProtectedRoute>
          <Chat />
        </ProtectedRoute>
      }
    />
    <Route
      path="/chat/:petId"
      element={
        <ProtectedRoute>
          <ChatRoom />
        </ProtectedRoute>
      }
    />
    <Route
      path="/chat/professional/:userId"
      element={
        <ProtectedRoute>
          <ChatRoom />
        </ProtectedRoute>
      }
    />
    <Route
      path="/communities"
      element={
        <ProtectedRoute>
          <Communities />
        </ProtectedRoute>
      }
    />
    <Route
      path="/notifications"
      element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      }
    />
    <Route
      path="/explore"
      element={
        <ProtectedRoute>
          <Explore />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      }
    />

    {/* Redirecionamento raiz */}
    <Route path="/" element={<RootRedirect />} />

    {/* Not found */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <UserProfileProvider>
            <PetProvider>
              <AppRoutes />
            </PetProvider>
          </UserProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
