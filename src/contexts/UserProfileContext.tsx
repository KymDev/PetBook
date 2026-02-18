import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AccountType = 'user' | 'professional';

export interface UserProfile {
  id: string;
  account_type: AccountType | null;
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
  full_name?: string;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfessionalProfile: (data: any) => Promise<void>;
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

  const checkCompleteness = (p: UserProfile) => {
    if (p.account_type !== 'professional') return false;
    
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
    
    const isVet = p.professional_service_type === 'veterinario';
    const hasCrmv = !isVet || (p.professional_crmv && p.professional_crmv_state);
    
    return requiredFields.every(field => !!field) && isServiceTypeValid && hasSpecialties && hasCrmv;
  };

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

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from("user_profiles")
            .insert({ id: user.id, account_type: 'user' }) 
            .select()
            .single();

          if (insertError) {
             const { data: retryProfile, error: retryError } = await supabase
                .from("user_profiles")
                .insert({ id: user.id })
                .select()
                .single();
             
             if (retryError) throw retryError;
             setProfile(retryProfile as any);
          } else {
            setProfile(newProfile as any);
          }
          setIsProfileComplete(false);
        } else {
          throw error;
        }
      } else {
        setProfile(data as any);
        setIsProfileComplete(checkCompleteness(data as any));
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

  const updateProfessionalProfile = async (data: any) => {
    if (!user) return;

    try {
      const updateData = { 
        ...data, 
        account_type: 'professional',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      await fetchProfile();
    } catch (error) {
      console.error("Error updating professional profile:", error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };
  
  const setAccountType = async (type: AccountType) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ account_type: type })
        .eq("id", user.id);
        
      if (error) throw error;
      
      await fetchProfile();
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
