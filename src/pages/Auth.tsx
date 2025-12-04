import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PetBookLogo } from "@/components/PetBookLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already logged in
  if (user) {
    navigate("/feed");
    return null;
  }

  const handleSubmit = async (type: "login" | "signup") => {
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (type === "signup") {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Email já cadastrado",
              description: "Este email já está em uso. Tente fazer login.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Conta criada!",
            description: "Verifique seu e-mail para confirmar sua conta antes de cadastrar seu pet.",
          });
          navigate("/auth/confirm");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erro ao entrar",
            description: "Email ou senha incorretos.",
            variant: "destructive",
          });
        } else {
          navigate("/feed");
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <PetBookLogo size="lg" />
          </div>
          <p className="text-muted-foreground">
            Conecte seu pet com amigos de todo o mundo
          </p>
        </div>

        <Card className="card-elevated border-0">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4">
              <TabsContent value="login" className="space-y-4 mt-0">
                <CardTitle className="text-xl">Bem-vindo de volta!</CardTitle>
                <CardDescription>
                  Entre com sua conta para acessar o PetBook
                </CardDescription>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <CardTitle className="text-xl">Crie sua conta</CardTitle>
                <CardDescription>
                  Cadastre-se para começar a usar o PetBook
                </CardDescription>
              </TabsContent>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit("login")}
                    />
                  </div>
                </div>

                <TabsContent value="login" className="mt-0 pt-2">
                  <Button
                    onClick={() => handleSubmit("login")}
                    disabled={loading}
                    className="w-full gradient-bg gap-2"
                    size="lg"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Entrar
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="mt-0 pt-2">
                  <Button
                    onClick={() => handleSubmit("signup")}
                    disabled={loading}
                    className="w-full gradient-bg gap-2"
                    size="lg"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Criar conta
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </TabsContent>
              </div>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
