import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { HealthSection } from "@/components/health/HealthSection";
import { EmergencyCard } from "@/components/health/EmergencyCard";
import { EmergencyButton } from "@/components/health/EmergencyButton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PawPrint, ChevronLeft, QrCode, HeartPulse, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const PetHealth = () => {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (petId) fetchPetData();
  }, [petId]);

  const fetchPetData = async () => {
    setLoading(true);
    try {
      const { data: petData, error } = await supabase
        .from("pets")
        .select("*")
        .eq("id", petId)
        .single();

      if (error || !petData) {
        setPet(null);
      } else {
        setPet(petData as Pet);
      }
    } catch (err) {
      console.error("Erro ao buscar dados do pet:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-6 space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!pet) {
    return (
      <MainLayout>
        <div className="container max-w-xl py-6">
          <Card className="card-elevated border-0">
            <CardContent className="p-6 text-center">
              <PawPrint className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Pet não encontrado</p>
              <Button variant="link" onClick={() => navigate(-1)} className="mt-4">
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isGuardian = user && pet.user_id === user.id;
  const isProfessional = profile?.account_type === 'professional';

  return (
    <MainLayout>
      <div className="bg-white border-b sticky top-14 z-40">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/pet/${petId}`)}
              className="rounded-full"
            >
              <ChevronLeft size={24} />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Saúde do Animal</h1>
              <p className="text-xs text-muted-foreground">{pet.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-6 px-4">
        {/* Banner de Status de Acesso */}
        {isGuardian ? (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Acesso Total do Guardião</h2>
                <p className="text-xs text-green-50 opacity-90">Você é o proprietário destas informações</p>
              </div>
            </div>
          </div>
        ) : isProfessional && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Modo de Consulta Rápida</h2>
                <p className="text-xs text-blue-50 opacity-90">Acesso autorizado via QR Code PetBook</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 space-y-4">
          <EmergencyCard petId={petId!} />
          {isGuardian && <EmergencyButton petId={petId!} />}
        </div>
        <HealthSection petId={petId!} />
        
        {/* Rodapé Informativo */}
        <div className="mt-8 p-6 bg-muted/30 rounded-2xl border border-dashed text-center">
          <HeartPulse className="h-8 w-8 text-primary/20 mx-auto mb-3" />
          {isGuardian ? (
            <>
              <h3 className="font-bold text-sm text-foreground">Gerenciamento de Saúde</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Mantenha o prontuário do seu pet atualizado. Você pode compartilhar o QR Code acima com veterinários para facilitar o atendimento.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-bold text-sm text-foreground">Informações para o Profissional</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Este prontuário é colaborativo. Como profissional autorizado, você pode adicionar novos registros que aparecerão assinados com seu nome/CRMV.
              </p>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default PetHealth;
