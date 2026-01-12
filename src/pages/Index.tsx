import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { myPets, loading: petLoading } = usePet();
  const { profile, loading: profileLoading } = useUserProfile();

  useEffect(() => {
    if (authLoading || petLoading || profileLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!profile) return;

    const hasPets = myPets && myPets.length > 0;
    const isProfessional = profile.account_type === 'professional';

    if (isProfessional) {
      navigate("/professional-dashboard", { replace: true });
    } else if (hasPets) {
      navigate("/feed", { replace: true });
    } else if (profile.account_type === 'user') {
      navigate("/create-pet", { replace: true });
    } else {
      navigate("/signup-choice", { replace: true });
    }
  }, [user, profile, myPets, authLoading, petLoading, profileLoading, navigate]);

  return <LoadingScreen message="Redirecionando..." />;
};

export default Index;
