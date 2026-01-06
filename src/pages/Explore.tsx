import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Pet, usePet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck } from "lucide-react";

interface PetWithFollowStatus extends Pet {
  isFollowing?: boolean;
}

const Explore = () => {
  const { currentPet } = usePet();
  const [pets, setPets] = useState<PetWithFollowStatus[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPets();
  }, [currentPet]);

  const fetchPets = async () => {
    setLoading(true);
    
    // Buscar todos os pets
    const { data: allPets } = await supabase
      .from("pets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (!allPets) {
      setLoading(false);
      return;
    }

    // Se tem pet atual, verificar quais ele segue
    if (currentPet) {
      const { data: followingData } = await supabase
        .from("followers")
        .select("target_pet_id")
        .eq("follower_id", currentPet.id);

      const followingIds = new Set(followingData?.map(f => f.target_pet_id) || []);

      const petsWithStatus = allPets.map(pet => ({
        ...pet,
        isFollowing: followingIds.has(pet.id)
      }));

      setPets(petsWithStatus);
    } else {
      setPets(allPets);
    }
    
    setLoading(false);
  };

  const filtered = pets.filter(
    (p) =>
      // Não mostrar o próprio pet
      p.id !== currentPet?.id &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.species.toLowerCase().includes(search.toLowerCase()) ||
      p.breed.toLowerCase().includes(search.toLowerCase()) ||
      p.guardian_instagram_username.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-4">
        <h1 className="text-2xl font-heading font-bold">Explorar</h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pets por nome, espécie, raça ou guardião..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando pets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="card-elevated border-0">
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search ? "Nenhum pet encontrado" : "Nenhum pet disponível"}
              </p>
              {search && (
                <p className="text-sm text-muted-foreground mt-2">
                  Tente buscar por outro termo
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((pet) => (
              <Link key={pet.id} to={`/pet/${pet.id}`}>
                <Card className="card-elevated border-0 hover:shadow-lg transition-shadow overflow-hidden relative">
                  {pet.isFollowing && (
                    <Badge 
                      className="absolute top-2 right-2 z-10 bg-primary/90 backdrop-blur-sm"
                      variant="default"
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      Seguindo
                    </Badge>
                  )}
                  <CardContent className="p-4 text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-2 border-2 border-primary/20">
                      <AvatarImage src={pet.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {pet.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold truncate">{pet.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {pet.species} • {pet.breed}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      @{pet.guardian_instagram_username}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
        
        {!loading && filtered.length > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "pet encontrado" : "pets encontrados"}
          </p>
        )}
      </div>
    </MainLayout>
  );
};

export default Explore;
