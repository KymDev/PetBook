import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para o feed ao carregar a página inicial
    // O ProtectedRoute no App.tsx cuidará da lógica de autenticação
    navigate("/feed", { replace: true });
  }, [navigate]);

  return <LoadingScreen message="Redirecionando para o Feed..." />;
};

export default Index;
