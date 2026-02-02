import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Stethoscope, Loader2, Lock, Unlock, Clock } from "lucide-react";
import { toast } from "sonner";
import { requestHealthAccess } from "@/integrations/supabase/healthRecordsService";

interface HealthAccessButtonProps {
  petId: string;
  professionalId: string;
  status: 'none' | 'pending' | 'granted' | 'revoked';
  onStatusChange: (newStatus: 'none' | 'pending' | 'granted' | 'revoked') => void;
  isFollowing: boolean;
  professionalServiceType?: string;
}

export function HealthAccessButton({
  petId,
  professionalId,
  status,
  onStatusChange,
  isFollowing,
  professionalServiceType,
}: HealthAccessButtonProps) {
  const isHealthProfessional = professionalServiceType === 'veterinario' || professionalServiceType === 'adestrador' || professionalServiceType === 'groomer' || professionalServiceType === 'outros';
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestAccess = async () => {
    if (!isHealthProfessional) {
      toast.error("Apenas profissionais de saúde (veterinários) podem solicitar acesso ao prontuário.");
      return;
    }

    // Removida a obrigatoriedade de seguir para facilitar o fluxo profissional
    /*
    if (!isFollowing) {
      toast.error("Você precisa seguir o pet para solicitar acesso à ficha de saúde.");
      return;
    }
    */

    setIsLoading(true);
    try {
      const { data, error } = await requestHealthAccess(petId, professionalId);

      if (error) {
        throw new Error(error.message || "Erro ao solicitar acesso.");
      }

      if (data) {
        onStatusChange(data.status as 'pending');
        toast.success("Solicitação de acesso enviada! O guardião precisa aprovar.");
      }
    } catch (error) {
      console.error("Erro ao solicitar acesso:", error);
      toast.error("Falha ao enviar a solicitação de acesso.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderButton = () => {
    switch (status) {
      case 'granted':
        return (
          <Button variant="default" className="gap-2 bg-green-500 hover:bg-green-600" disabled>
            <Unlock className="h-4 w-4" />
            Acesso Concedido
          </Button>
        );
      case 'pending':
        return (
          <Button variant="outline" className="gap-2" disabled>
            <Clock className="h-4 w-4 animate-spin" />
            Aguardando Aprovação
          </Button>
        );
      case 'revoked':
        return (
          <Button variant="destructive" className="gap-2" onClick={handleRequestAccess} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Acesso Revogado (Solicitar Novamente)
          </Button>
        );
      case 'none':
      default:
        if (!isHealthProfessional) return null;
        return (
          <Button variant="outline" className="gap-2" onClick={handleRequestAccess} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
            Solicitar Ficha de Saúde
          </Button>
        );
    }
  };

  return renderButton();
}
