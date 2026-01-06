import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PetBookLogo } from "@/components/PetBookLogo";
import { ArrowRight, Heart, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function SignupChoice() {
  const { setAccountType, profile, isProfileComplete } = useUserProfile();
  const navigate = useNavigate();

  const handleNormalSignup = async () => {
    try {
      if (setAccountType) {
        await setAccountType("user");
      }
      navigate("/feed");
    } catch (error) {
      toast.error("Erro ao definir tipo de conta");
    }
  };

  const handleProfessionalSignup = async () => {
    try {
      if (setAccountType) {
        await setAccountType("professional");
      }
      
      // Se o perfil já estiver completo, vai direto para o dashboard
      if (isProfileComplete || profile?.professional_bio) {
        navigate("/professional-dashboard");
      } else {
        navigate("/professional-signup");
      }
    } catch (error) {
      toast.error("Erro ao definir tipo de conta");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <PetBookLogo size="lg" />
          </div>
          <h1 className="text-4xl font-heading font-bold mb-4">Bem-vindo ao PetBook!</h1>
          <p className="text-xl text-muted-foreground">Escolha como você quer começar sua jornada</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer group bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4"><Heart className="w-8 h-8 text-primary" /></div>
              <CardTitle className="text-2xl">Guardião de Pet</CardTitle>
              <CardDescription>Cadastre seus pets e conecte-se com a comunidade</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleNormalSignup} className="w-full h-11 font-semibold">
                Começar como Guardião <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-secondary/30 hover:border-secondary/60 transition-all cursor-pointer group bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="p-3 bg-secondary/10 rounded-lg w-fit mb-4"><Briefcase className="w-8 h-8 text-secondary" /></div>
              <CardTitle className="text-2xl">Profissional</CardTitle>
              <CardDescription>Ofereça seus serviços e cresça seu negócio</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleProfessionalSignup} variant="outline" className="w-full h-11 font-semibold border-secondary/30">
                Começar como Profissional <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
