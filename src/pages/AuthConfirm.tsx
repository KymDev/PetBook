import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AuthConfirm = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Usuário já confirmou e está logado → vai para criar pet
      navigate("/create-pet");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold">Verifique seu e-mail</h1>
      <p className="mt-4 text-center">
        Enviamos um link de confirmação para seu e-mail. 
        Clique no link para ativar sua conta e poder cadastrar seu pet.
      </p>
    </div>
  );
};

export default AuthConfirm;
