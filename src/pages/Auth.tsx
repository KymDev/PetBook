import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PetBookLogo } from "@/components/PetBookLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const authSchema = z.object({
    email: z.string().email(t("auth.email_invalid") || "Email inválido"),
    password: z.string().min(6, t("auth.password_min") || "A senha deve ter pelo menos 6 caracteres"),
  });

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (type: "login" | "signup") => {
    const validation = authSchema.safeParse({ email, password });

    if (!validation.success) {
      toast({
        title: t("auth.error_validation"),
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
              title: t("auth.email_already_registered") || "Email já cadastrado",
              description: t("auth.email_already_registered_desc") || "Este email já está em uso. Tente fazer login.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: t("auth.account_created"),
            description: t("auth.account_created_desc"),
          });
          navigate("/auth/confirm");
        }
      } else {
        const { error } = await signIn(email, password);

        if (error) {
          toast({
            title: t("auth.error_login"),
            description: t("auth.error_login_desc"),
            variant: "destructive",
          });
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("common.something_went_wrong"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <PetBookLogo size="lg" />
          </div>
          <p className="text-muted-foreground">
            {t("auth.welcome")}
          </p>
        </div>

        <Card className="card-elevated border-0">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4">
              <TabsContent value="login">
                <CardTitle className="text-xl">{t("auth.welcome_back")}</CardTitle>
                <CardDescription>
                  {t("auth.login_description")}
                </CardDescription>
              </TabsContent>

              <TabsContent value="signup">
                <CardTitle className="text-xl">{t("auth.signup_title")}</CardTitle>
                <CardDescription>
                  {t("auth.signup_description")}
                </CardDescription>
              </TabsContent>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.email_placeholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
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
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSubmit("login")
                      }
                    />
                  </div>
                </div>

                <TabsContent value="login">
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
                        {t("auth.login")} <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="signup">
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
                        {t("auth.signup")} <ArrowRight className="h-4 w-4" />
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
