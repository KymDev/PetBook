import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

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
  pets: Pet[];
  loading: boolean;
  selectPet: (pet: Pet) => void;
  refreshPets: () => Promise<void>;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

export const PetProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentPet, setCurrentPet] = useState<Pet | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPets = async () => {
    if (!user) {
      setPets([]);
      setCurrentPet(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("pets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setPets(data);
      if (data.length > 0 && !currentPet) {
        setCurrentPet(data[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPets();
  }, [user]);

  const selectPet = (pet: Pet) => {
    setCurrentPet(pet);
  };

  const refreshPets = async () => {
    await fetchPets();
  };

  return (
    <PetContext.Provider value={{ currentPet, pets, loading, selectPet, refreshPets }}>
      {children}
    </PetContext.Provider>
  );
};

// Hook para consumir o contexto
export const usePet = () => {
  const context = useContext(PetContext);
  if (!context) {
    throw new Error("usePet must be used within a PetProvider");
  }
  return context;
};
