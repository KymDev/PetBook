import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) checkAdminStatus(session.user.id);
        else setIsAdmin(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) checkAdminStatus(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/auth/confirm`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async () => {
    if (!user) return { error: new Error("Nenhum usuário logado") };

    try {
      // CORREÇÃO: Não podemos usar supabase.auth.admin.deleteUser no frontend.
      // Em vez disso, chamamos uma função RPC no banco de dados que deleta o usuário.
      // Ou, se preferir uma abordagem mais simples, deletamos os dados e fazemos logout.
      
      // 1. Deleta os dados do perfil (o ON DELETE CASCADE deve cuidar dos pets e posts)
      const { error: profileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", user.id);
      
      if (profileError) throw profileError;

      // 2. Chama a função RPC para deletar a conta de autenticação (se você criou o script SQL)
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      
      if (rpcError) {
        console.warn("RPC delete_user_account falhou ou não existe. Fazendo apenas logout.");
      }

      // 3. Faz logout
      await supabase.auth.signOut();

      return { error: null };
    } catch (error: any) {
      console.error("Erro ao deletar conta:", error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut, deleteAccount, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
