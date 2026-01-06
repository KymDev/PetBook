import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AccountType = 'user' | 'professional';

export interface UserProfile {
  id: string;
  account_type: AccountType;
  is_professional_verified: boolean;
  professional_bio?: string;
  professional_specialties?: string[];
  professional_phone?: string;
  professional_address?: string;
  professional_city?: string;
  professional_state?: string;
  professional_zip?: string;
  professional_price_range?: string;
  professional_service_type?: string;
  professional_whatsapp?: string;
  professional_latitude?: number | null;
  professional_longitude?: number | null;
  professional_custom_service_type?: string;
  professional_avatar_url?: string;
  professional_crmv?: string;
  professional_crmv_state?: string;
  created_at: string;
  updated_at: string;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  switchAccountType: (type: AccountType) => Promise<void>;
  updateProfessionalProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setAccountType: (type: AccountType) => Promise<void>;
  isProfileComplete: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const fetchProfile = async () => {

    if (!user) {
      setProfile(null);
      setLoading(false);

      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

            if (data && !data.account_type) {
        // Se o perfil existe, mas não tem account_type, verificar se tem pets
        const { data: pets } = await supabase
          .from('pets')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (pets && pets.length > 0) {
          // Se tem pets, definir como 'user' e atualizar o perfil
          const { data: updatedProfile, error: updateError } = await supabase
            .from('user_profiles')
            .update({ account_type: 'user' })
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) throw updateError;
          setProfile(updatedProfile as UserProfile);
        } else {
          setProfile(data as UserProfile);
        }
      } else if (error) {
        // Se o perfil não existir, criar um
        if (error.code === 'PGRST116') {

          const { data: newProfile, error: insertError } = await supabase
            .from("user_profiles")
            .insert({ id: user.id, account_type: 'user' })
            .select()
            .single();

          if (insertError) throw insertError;
          setProfile(newProfile as UserProfile);

        } else {
          throw error;
        }
      } else {
        setProfile(data as UserProfile);
        // Verificar se o perfil profissional está completo
        if (data.account_type === 'professional') {
          const checkCompleteness = (p: UserProfile) => {
            const requiredFields = [
              p.professional_service_type,
              p.professional_bio,
              p.professional_phone,
              p.professional_address,
              p.professional_city,
              p.professional_state,
              p.professional_zip,
            ];
            const isServiceTypeValid = p.professional_service_type && (p.professional_service_type !== 'outros' || (p.professional_service_type === 'outros' && p.professional_custom_service_type));
            const hasSpecialties = p.professional_specialties && p.professional_specialties.length > 0;
            
            // Se for veterinário, CRMV e Estado do CRMV são obrigatórios para ser "completo"
            const isVet = p.professional_service_type === 'veterinario';
            const hasCrmv = !isVet || (p.professional_crmv && p.professional_crmv_state);
            
            return requiredFields.every(field => !!field) && isServiceTypeValid && hasSpecialties && hasCrmv;
          };
          setIsProfileComplete(checkCompleteness(data as UserProfile));
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);

    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const switchAccountType = async (type: AccountType) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ account_type: type })
        .eq("id", user.id);
      if (error) throw error;
      
      // Atualizar estado local e recarregar
      await fetchProfile();
    } catch (error) {
      console.error("Error switching account type:", error);
      throw error;
    }
  };

  const updateProfessionalProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update(data)
        .eq("id", user.id);

      if (error) throw error;

      // Atualizar estado local
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Error updating professional profile:", error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };
  
  // Função para ser chamada pelo RootRedirect/ProtectedRoute para definir o account_type
  const setAccountType = async (type: AccountType) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ account_type: type })
        .eq("id", user.id);
        
      if (error) throw error;
      
      // Atualizar estado local e recarregar
      setProfile(prev => prev ? { ...prev, account_type: type } : null);
      await refreshProfile();
    } catch (error) {
      console.error("Error setting account type:", error);
      throw error;
    }
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        loading,
        switchAccountType,
        updateProfessionalProfile,
        refreshProfile,
        setAccountType,
        isProfileComplete,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProfileProvider");
  return ctx;
};
