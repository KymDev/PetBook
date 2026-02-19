import React from 'react';
import { HeartPulse } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from 'react-router-dom';
import { useUserProfile } from "@/contexts/UserProfileContext";

interface GuardianPetHeaderProps {
  petName: string;
  showHealthButton?: boolean;
}

export const GuardianPetHeader: React.FC<GuardianPetHeaderProps> = ({ petName, showHealthButton = true }) => {
  const navigate = useNavigate();
  const { petId } = useParams<{ petId: string }>();
  const { profile } = useUserProfile();
  
  const isProfessional = profile?.account_type === 'professional';

  const handleHealthClick = () => {
    if (isProfessional) {
      navigate('/professional-dashboard');
    } else {
      navigate(`/pet/${petId}/health`);
    }
  };

  if (!showHealthButton) {
    return (
      <div className="w-full bg-white dark:bg-background/95 backdrop-blur-lg p-3 md:p-6 border-b md:border md:rounded-2xl flex justify-between items-center md:sticky md:top-20 z-40 shadow-sm md:mb-6">
        <div className="flex items-center gap-3 overflow-hidden">
          <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{petName}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-background/95 backdrop-blur-lg p-3 md:p-6 border-b md:border md:rounded-2xl flex justify-between items-center md:sticky md:top-20 z-40 shadow-sm md:mb-6">
      <div className="flex items-center gap-3 overflow-hidden">
        <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{petName}</h1>
      </div>
      
      <div className="flex gap-2 flex-shrink-0">
        <Button 
          onClick={handleHealthClick}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 md:gap-2 bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:text-red-700 rounded-full font-semibold transition-colors h-9 md:h-12 px-4 md:px-6"
        >
          <HeartPulse size={18} className="md:w-5 md:h-5" />
          <span className="text-xs md:text-base">{isProfessional ? 'Painel do Profissional' : 'Central de Saúde'}</span>
        </Button>
      </div>
    </div>
  );
};
