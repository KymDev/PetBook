import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
// import { useUserProfile } from "./UserProfileContext"; // Removido para evitar dependência circular

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  bio: string | null;
  avatar_url: string | null;
  guardian_name: string;
  guardian_instagram_username: string;
  guardian_instagram_url: string | null;
  created_at: string;
}

interface PetContextType {
  currentPet: Pet | null;
  myPets: Pet[];
  following: Pet[];
  allPets: Pet[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  selectPet: (pet: Pet) => void;
  followPet: (id: string) => Promise<void>;
  unfollowPet: (id: string) => Promise<void>;
  searchPets: (query: string) => Pet[];
  deletePet: (petId: string) => Promise<void>;
  isProfessionalFollowing: (targetPetId: string) => Promise<boolean>; // NOVO
}

const PetContext = createContext<PetContextType | undefined>(undefined);

// Importação movida para dentro do PetProvider para evitar dependência circular
import { useUserProfile } from "./UserProfileContext";

export const PetProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(); // Chamada movida para aqui

  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [currentPet, setCurrentPet] = useState<Pet | null>(null);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [following, setFollowing] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMyPets = async () => {
    if (!user) {
      setMyPets([]);
      setCurrentPet(null);
      return;
    }

    const { data, error } = await supabase // <-- CORREÇÃO: Adicionado 'error'
      .from("pets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");

    if (error) { // <-- CORREÇÃO: Tratamento de erro para diagnóstico
      console.error("ERRO AO CARREGAR MEUS PETS:", error);
      setMyPets([]);
      setCurrentPet(null);
      return;
    }

    setMyPets(data || []);
    // Se o usuário for um profissional, currentPet deve ser null
    if (profile?.account_type === 'professional') {
      setCurrentPet(null);
    } else {
      // Se o pet recém-criado for o único, ele deve ser o currentPet
      if (data && data.length > 0) {
        // Tenta manter o pet atual, se existir, senão usa o primeiro da lista
        const selectedPet = currentPet && data.find(p => p.id === currentPet.id) ? currentPet : data[0];
        setCurrentPet(selectedPet);
      } else {
        setCurrentPet(null);
      }
    }
  };

  const loadAllPets = async () => {
    const { data } = await supabase.from("pets").select("*");
    setAllPets(data || []);
  };

  // Função para verificar se o profissional segue um pet
  const isProfessionalFollowing = async (targetPetId: string): Promise<boolean> => {
    if (!user) return false;

    const { data } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_id", user.id)
      .eq("target_pet_id", targetPetId)
      .eq("is_user_follower", true)
      .single();

    return !!data;
  };

  const loadFollowing = async (petId: string) => {
    // Carrega pets seguidos por um pet
    const { data: rows } = await supabase
      .from("followers")
      .select("target_pet_id")
      .eq("follower_id", petId);

    if (!rows?.length) {
      setFollowing([]);
      return;
    }

    const ids = rows.map(r => r.target_pet_id);

    const { data: pets } = await supabase
      .from("pets")
      .select("*")
      .in("id", ids);

    setFollowing(pets || []);
  };

  const followPet = async (targetPetId: string) => {
    if (!user) return; // Precisa de um usuário logado
    
    // Impede que um pet siga a si mesmo
    if (currentPet && targetPetId === currentPet.id) {
      console.warn("Um pet não pode seguir a si mesmo.");
      return;
    }

    // Profissionais seguem como user_id, Guardiões seguem como pet_id
    const followerId = currentPet ? currentPet.id : user.id;
    const isProfessional = !currentPet; // Se não tem currentPet, é profissional

    await supabase.from("followers").insert({
      follower_id: followerId, // ID do pet ou do usuário
      target_pet_id: targetPetId,
      is_user_follower: isProfessional, // Indica se quem segue é um usuário (profissional)
    });

    // Se for pet, carrega os pets seguidos. Se for profissional, não precisa carregar pets seguidos.
    if (currentPet) {
      await loadFollowing(currentPet.id);
    }
  };

  const unfollowPet = async (targetPetId: string) => {
    if (!user) return; // Precisa de um usuário logado

    const followerId = currentPet ? currentPet.id : user.id;
    const isProfessional = !currentPet;

    let query = supabase
      .from("followers")
      .delete()
      .eq("target_pet_id", targetPetId)
      .eq("follower_id", followerId);

    if (isProfessional) {
      query = query.eq("is_user_follower", true);
    } else {
      query = query.eq("is_user_follower", false);
    }

    await query;

    if (currentPet) {
      await loadFollowing(currentPet.id);
    }
  };

  const deletePet = async (petId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("pets")
      .delete()
      .eq("id", petId)
      .eq("user_id", user.id); // Garante que só o dono pode excluir

    if (error) throw error;

    // Atualiza a lista de pets no contexto
    setMyPets(prev => prev.filter(p => p.id !== petId));
    
    // Se o pet excluído era o pet atual, define o novo pet atual
    if (currentPet?.id === petId) {
      setCurrentPet(myPets.filter(p => p.id !== petId)[0] || null);
    }
  };

  const searchPets = (query: string) => {
    const q = query.toLowerCase();
    return allPets.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.guardian_name.toLowerCase().includes(q)
    );
  };

  const refreshAll = async () => {
    setLoading(true);
    await loadMyPets();
    await loadAllPets();
    setLoading(false);
  };

  useEffect(() => {
    if (user === undefined || profileLoading) return; // Espera o Auth e o Profile carregarem

    if (!user) {
      setMyPets([]);
      setCurrentPet(null);
      setLoading(false);
      return;
    }

    // Se o usuário está logado e o perfil carregou, carrega os pets
    refreshAll();
  }, [user?.id, profileLoading, profile?.account_type]); // Dependências mais específicas para evitar loops


  useEffect(() => {
    if (currentPet) {
      loadFollowing(currentPet.id);
    } else {
      setFollowing([]);
    }
  }, [currentPet]);

  return (
    <PetContext.Provider
      value={{
        currentPet,
        myPets,
        allPets,
        following,
        loading,
        refreshAll,
        selectPet: setCurrentPet,
        followPet,
        unfollowPet,
        searchPets,
        deletePet,
        isProfessionalFollowing, // NOVO
      }}
    >
      {children}
    </PetContext.Provider>
  );
};

export const usePet = () => {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error("usePet must be used inside PetProvider");
  return ctx;
};
