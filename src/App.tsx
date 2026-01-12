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
import PetHealth from "./pages/PetHealth";
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
import ProfessionalPublicProfile from "./pages/ProfessionalPublicProfile";
import EditPet from "./pages/EditPet";
import ScanHealth from "./pages/ScanHealth";

import HealthRecordsPage from "./components/HealthRecords/HealthRecordsPage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./integrations/supabase/client";

const HealthRecordsWrapper = () => {
  const { petId } = useParams<{ petId: string }>();

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
  if (!petId || !pet) return <NotFound />;

  return <HealthRecordsPage petId={petId} petName={pet.name} />;
};

const RootRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const { myPets, loading: petLoading } = usePet();
  const { profile, loading: profileLoading, isProfileComplete } = useUserProfile();

  if (authLoading || petLoading || profileLoading) return <LoadingPage />;

  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <LoadingPage />;

  const hasPets = myPets && myPets.length > 0;
  const isProfessional = profile.account_type === 'professional';
  
  // Se é profissional
  if (isProfessional) {
    if (isProfileComplete) {
      return <Navigate to="/professional-dashboard" replace />;
    }
    return <Navigate to="/professional-signup" replace />;
  }

  // Se é guardião
  if (hasPets) {
    return <Navigate to="/feed" replace />;
  } else if (profile.account_type === 'user') {
    // Se escolheu ser guardião mas não tem pet, vai para criar pet
    return <Navigate to="/create-pet" replace />;
  }

  return <Navigate to="/signup-choice" replace />;
};

const queryClient = new QueryClient();

const AuthRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading: authLoading } = useAuth();
  if (authLoading) return <LoadingPage />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading: authLoading } = useAuth();
  const { myPets, loading: petLoading } = usePet();
  const { profile, loading: profileLoading } = useUserProfile();

  if (authLoading || petLoading || profileLoading) return <LoadingPage />;
  if (!user) return <Navigate to="/auth" replace />;

  const isProfessional = profile?.account_type === 'professional';
  const hasPets = myPets && myPets.length > 0;
  const isCreatePetPage = window.location.pathname.includes('/create-pet');
  const isSignupChoicePage = window.location.pathname.includes('/signup-choice');
  const isProfessionalSignupPage = window.location.pathname.includes('/professional-signup');

  // Se não tem pet e não é profissional, e não está em uma página de "setup", redireciona
  if (!hasPets && !isProfessional && !isCreatePetPage && !isSignupChoicePage && !isProfessionalSignupPage) {
    return <Navigate to="/signup-choice" replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/auth/confirm" element={<AuthConfirm />} />
    <Route path="/signup-choice" element={<AuthRoute><SignupChoice /></AuthRoute>} />
    <Route path="/professional-signup" element={<AuthRoute><ProfessionalSignup /></AuthRoute>} />

    <Route
      path="/services"
      element={
        <ProtectedRoute>
          <ServiceProvidersPage />
        </ProtectedRoute>
      }
    />

    <Route
      path="/professional-profile"
      element={
        <ProtectedRoute>
          <ProfessionalProfile />
        </ProtectedRoute>
      }
    />

    <Route
      path="/professional-dashboard"
      element={
        <ProtectedRoute>
          <ProfessionalDashboard />
        </ProtectedRoute>
      }
    />

    <Route
      path="/professional/:userId"
      element={
        <ProtectedRoute>
          <ProfessionalPublicProfile />
        </ProtectedRoute>
      }
    />

    <Route
      path="/create-pet"
      element={
        <ProtectedRoute>
          <CreatePet />
        </ProtectedRoute>
      }
    />

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
      path="/pet/:petId"
      element={
        <ProtectedRoute>
          <PetProfile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/pet/:petId/health"
      element={
        <ProtectedRoute>
          <PetHealth />
        </ProtectedRoute>
      }
    />
    
    <Route
      path="/scan-health"
      element={
        <ProtectedRoute>
          <ScanHealth />
        </ProtectedRoute>
      }
    />
    
    <Route
      path="/edit-pet/:petId"
      element={
        <ProtectedRoute>
          <EditPet />
        </ProtectedRoute>
      }
    />
    
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

    <Route path="/" element={<RootRedirect />} />
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
