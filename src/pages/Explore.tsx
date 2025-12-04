import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Pet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Explore = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    const { data } = await supabase.from("pets").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setPets(data);
  };

  const filtered = pets.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.species.toLowerCase().includes(search.toLowerCase()) ||
      p.breed.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-4">
        <h1 className="text-2xl font-heading font-bold">Explorar</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((pet) => (
            <Link key={pet.id} to={`/pet/${pet.id}`}>
              <Card className="card-elevated border-0 hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-4 text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-2">
                    <AvatarImage src={pet.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {pet.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold truncate">{pet.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {pet.species} • {pet.breed}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Explore;
