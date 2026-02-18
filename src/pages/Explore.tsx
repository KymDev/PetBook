import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Pet, usePet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Image as ImageIcon, Users, BadgeCheck, Stethoscope } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface PetWithStatus extends Pet {
  isFollowing?: boolean;
  isFamily?: boolean;
}

interface PostWithPet {
  id: string;
  media_url: string;
  pet_id: string;
  pets: {
    name: string;
    avatar_url: string | null;
  };
}

interface ProfessionalProfile {
  id: string;
  full_name: string;
  professional_avatar_url: string | null;
  professional_service_type: string;
  professional_address: string;
}

const Explore = () => {
  const { currentPet } = usePet();
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const [pets, setPets] = useState<PetWithStatus[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [posts, setPosts] = useState<PostWithPet[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  const isProfessional = profile?.account_type === 'professional';

  useEffect(() => {
    if (activeTab === "posts") {
      fetchPosts();
    } else if (activeTab === "pets") {
      fetchPets();
    } else if (activeTab === "professionals") {
      fetchProfessionals();
    }
  }, [activeTab, currentPet, user]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        media_url,
        pet_id,
        pets (
          name,
          avatar_url
        )
      `)
      .eq("type", "photo")
      .not("media_url", "is", null)
      .limit(100);

    if (data) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setPosts(shuffled.slice(0, 30) as any);
    }
    setLoading(false);
  };

  const fetchPets = async () => {
    setLoading(true);
    const { data: allPets } = await supabase
      .from("pets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (!allPets) {
      setLoading(false);
      return;
    }

    let followingIds = new Set<string>();
    if (currentPet) {
      const { data: followingData } = await supabase
        .from("followers")
        .select("target_pet_id")
        .eq("follower_id", currentPet.id);
      followingIds = new Set(followingData?.map(f => f.target_pet_id) || []);
    }

    const petsWithStatus = allPets.map(pet => ({
      ...pet,
      isFollowing: followingIds.has(pet.id),
      isFamily: user ? pet.user_id === user.id : false
    }));

    setPets(petsWithStatus);
    setLoading(false);
  };

  const fetchProfessionals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("id, full_name, professional_avatar_url, professional_service_type, professional_address")
      .eq("account_type", "professional")
      .limit(50);
    
    setProfessionals(data || []);
    setLoading(false);
  };

  const filteredPets = pets.filter(
    (p) =>
      p.id !== currentPet?.id &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.species.toLowerCase().includes(search.toLowerCase()) ||
      p.breed.toLowerCase().includes(search.toLowerCase()) ||
      (p.guardian_name && p.guardian_name.toLowerCase().includes(search.toLowerCase())) ||
      (p.guardian_instagram_username && p.guardian_instagram_username.toLowerCase().includes(search.toLowerCase())))
  );

  const filteredProfessionals = professionals.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.professional_service_type?.toLowerCase().includes(search.toLowerCase()) ||
      p.professional_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold">Explorar</h1>
          {isProfessional && (
            <Badge className="bg-blue-600 text-[10px] uppercase tracking-widest font-black">Modo Profissional</Badge>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar posts, pets ou profissionais..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value && activeTab === "posts") {
                setActiveTab("pets");
              }
            }}
            className="pl-10 rounded-2xl border-primary/10 focus-visible:ring-primary/20"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts" className="gap-2">
              <ImageIcon className="h-4 w-4" /> Posts
            </TabsTrigger>
            <TabsTrigger value="pets" className="gap-2">
              <Users className="h-4 w-4" /> Pets
            </TabsTrigger>
            <TabsTrigger value="professionals" className="gap-2">
              <Stethoscope className="h-4 w-4" /> Profissionais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            {loading ? (
              <div className="grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum post com foto encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <Link key={post.id} to={`/pet/${post.pet_id}`} className="aspect-square relative group overflow-hidden rounded-lg">
                    <img 
                      src={post.media_url} 
                      alt="Post" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white text-[10px] font-medium truncate">{post.pets.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pets" className="mt-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando pets...</div>
            ) : filteredPets.length === 0 ? (
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum pet encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredPets.map((pet) => (
                  <Link key={pet.id} to={`/pet/${pet.id}`}>
                    <Card className="card-elevated border-0 hover:bg-muted/50 transition-colors overflow-hidden rounded-2xl">
                      <CardContent className="p-3 flex items-center gap-4">
                        <Avatar className="h-12 w-12 border border-primary/10">
                          <AvatarImage src={pet.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {pet.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{pet.name}</p>
                            {pet.isFamily && (
                              <Badge className="bg-yellow-500 text-[10px] h-4 px-1 hover:bg-yellow-600 border-none">
                                Família
                              </Badge>
                            )}
                            {pet.isFollowing && !pet.isFamily && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                Seguindo
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {pet.species} • {pet.breed} • Guardião: {pet.guardian_name}
                          </p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-muted-foreground">@{pet.guardian_instagram_username}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="professionals" className="mt-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando profissionais...</div>
            ) : filteredProfessionals.length === 0 ? (
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum profissional encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredProfessionals.map((prof) => (
                  <Link key={prof.id} to={`/professional/${prof.id}`}>
                    <Card className="card-elevated border-0 hover:bg-blue-50/50 transition-colors overflow-hidden rounded-2xl border-l-4 border-l-blue-500">
                      <CardContent className="p-3 flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12 border border-blue-100">
                            <AvatarImage src={prof.professional_avatar_url || undefined} />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {prof.full_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                            <BadgeCheck className="h-2 w-2" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold truncate">{prof.full_name}</p>
                            <BadgeCheck className="h-3 w-3 text-blue-600" />
                          </div>
                          <p className="text-xs text-blue-600 font-bold uppercase tracking-tighter">
                            {prof.professional_service_type || "Especialista Pet"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {prof.professional_address || "Endereço não informado"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Explore;
