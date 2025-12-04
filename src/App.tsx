import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PetProvider } from "@/contexts/PetContext";
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
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AuthConfirm from "./pages/AuthConfirm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PetProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route path="/create-pet" element={<CreatePet />} />
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/create-pet" element={<CreatePet />} />
              <Route path="/create-post" element={<CreatePost />} />
              <Route path="/pet/:id" element={<PetProfile />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:petId" element={<ChatRoom />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PetProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
