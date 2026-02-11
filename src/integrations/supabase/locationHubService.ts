import { supabase } from "./client";

export interface MissingPet {
  id: string;
  pet_id: string;
  user_id: string;
  description: string | null;
  last_seen_location: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_whatsapp: string | null;
  photo_url: string | null;
  is_found: boolean;
  created_at: string;
  found_at: string | null;
  pet?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface PetFriendlyPlace {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  created_at: string;
  user_id: string | null;
}

export const locationHubService = {
  async getMissingPets() {
    // Calcula a data de 7 dias atrás
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("missing_pets")
      .select("*, pet:pet_id(name, avatar_url)")
      .eq("is_found", false)
      .gt("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as MissingPet[];
  },

  async getProfessionals() {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("account_type", "professional")
      .not("professional_latitude", "is", null);

    if (error) throw error;
    return data;
  },

  async reportMissingPet(missingPet: Partial<MissingPet>) {
    const { data, error } = await supabase
      .from("missing_pets")
      .insert([missingPet])
      .select()
      .single();

    if (error) throw error;
    return data as MissingPet;
  },

  async markAsFound(id: string) {
    const { data, error } = await supabase
      .from("missing_pets")
      .update({ is_found: true, found_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as MissingPet;
  },

  async getPetFriendlyPlaces() {
    const { data, error } = await supabase
      .from("pet_friendly_places")
      .select("*")
      .order("rating", { ascending: false });

    if (error) throw error;
    return data as PetFriendlyPlace[];
  },

  async addPetFriendlyPlace(place: Partial<PetFriendlyPlace>) {
    const { data, error } = await supabase
      .from("pet_friendly_places")
      .insert([place])
      .select()
      .single();

    if (error) throw error;
    return data as PetFriendlyPlace;
  },

  async updatePetFriendlyPlace(id: string, place: Partial<PetFriendlyPlace>) {
    const { data, error } = await supabase
      .from("pet_friendly_places")
      .update(place)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as PetFriendlyPlace;
  },

  async deletePetFriendlyPlace(id: string) {
    const { error } = await supabase
      .from("pet_friendly_places")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async togglePetFriendlyStatus(place: any, isFriendly: boolean, userId: string) {
    // Primeiro verifica se o local já existe no nosso banco (se veio do OSM)
    const { data: existing } = await supabase
      .from("pet_friendly_places")
      .select("id")
      .eq("name", place.name)
      .filter("latitude", "eq", place.latitude)
      .maybeSingle();

    if (existing) {
      return await supabase
        .from("pet_friendly_places")
        .update({ 
          category: isFriendly ? "Pet Friendly" : "Não Aceita Pets",
          rating: isFriendly ? 5 : 1
        })
        .eq("id", existing.id);
    } else {
      return await supabase
        .from("pet_friendly_places")
        .insert([{
          name: place.name,
          category: isFriendly ? "Pet Friendly" : "Não Aceita Pets",
          description: `Validado pela comunidade como ${isFriendly ? 'amigável' : 'não amigável'} para pets.`,
          latitude: place.latitude,
          longitude: place.longitude,
          user_id: userId,
          rating: isFriendly ? 5 : 1
        }]);
    }
  },

  async uploadPetPhoto(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `missing-pets/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('missing_pets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('missing_pets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
