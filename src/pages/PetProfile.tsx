import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeDisplay } from "@/components/pet/BadgeDisplay";
import { getPetBadges } from "@/integrations/supabase/badgeService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { HealthAccessButton } from "@/components/pet/HealthAccessButton";
import { Heart, PawPrint, Cookie, ExternalLink, UserPlus, UserMinus, MessageCircle, Settings, Users, ClipboardList, Plus, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GuardianPetHeader } from "@/components/layout/GuardianPetHeader";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  pet_id: string;
  type: string;
  description: string | null;
  media_url: string | null;
  created_at: string;
}

const PetProfile = () => {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const { currentPet, myPets, selectPet, followPet, unfollowPet, isProfessionalFollowing } = usePet();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isProfessional = profile?.account_type === 'professional';

  const [pet, setPet] = useState<Pet | null>(null);
  const [guardianProfile, setGuardianProfile] = useState<{ full_name: string, professional_whatsapp: string | null, account_type: string } | null>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [healthAccessStatus, setHealthAccessStatus] = useState<'none' | 'pending' | 'granted' | 'revoked'>('none');
  const [healthAccessId, setHealthAccessId] = useState<string | null>(null);

  useEffect(() => {
    if (petId) fetchPetProfile();
  }, [petId, currentPet, isProfessional, user]);

  const fetchPetProfile = async () => {
    setLoading(true);

    const { data: petData } = await supabase
      .from("pets")
      .select("*")
      .eq("id", petId)
      .single();

    const { data: badgesData } = await getPetBadges(petId!);
    if (badgesData) {
      setBadges(badgesData);
    }

    if (!petData) {
      setPet(null);
      setLoading(false);
      return;
    }

    setPet(petData as Pet);

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("full_name, professional_whatsapp, account_type")
      .eq("id", petData.user_id)
      .single();

    if (profileError) {
      console.error("Erro ao buscar perfil do guardião:", profileError);
      setGuardianProfile(null);
    } else {
      setGuardianProfile(profileData as { full_name: string, professional_whatsapp: string | null, account_type: string });
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("pet_id", petId)
      .order("created_at", { ascending: false });

    if (postsData) setPosts(postsData);

    if (petId) {
      if (isProfessional && user) {
        const isProfFollowing = await isProfessionalFollowing(petId);
        setIsFollowing(isProfFollowing);
      } else if (currentPet && currentPet.id !== petId) {
        const { data: followData } = await supabase
          .from("followers")
          .select("id")
          .eq("follower_id", currentPet.id)
          .eq("target_pet_id", petId)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    }

    const { count: followers } = await supabase
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("target_pet_id", petId);

    const { count: following } = await supabase
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", petId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);

    if (isProfessional && user && petId) {
      try {
        const { getHealthAccessStatus } = await import('@/integrations/supabase/healthRecordsService');
        const { data: accessData, error: accessError } = await getHealthAccessStatus(petId, user.id);
        
        if (accessError || !accessData) {
          setHealthAccessStatus('none');
          setHealthAccessId(null);
        } else {
          setHealthAccessStatus(accessData.status as 'pending' | 'granted' | 'revoked');
          setHealthAccessId(accessData.id);
        }
      } catch (err) {
        console.error("Erro ao verificar status de acesso:", err);
        setHealthAccessStatus('none');
        setHealthAccessId(null);
      }
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!pet) return;
    if (!currentPet && !isProfessional) return;

    try {
      if (isFollowing) {
        await unfollowPet(pet.id);
      } else {
        await followPet(pet.id);
      }

      setIsFollowing(!isFollowing);
      setFollowersCount((c) => (isFollowing ? c - 1 : c + 1));

      if (!isFollowing) {
        if (currentPet && !isProfessional) {
          await supabase.from("notifications").insert({
            pet_id: pet.id,
            type: "follow",
            message: `${currentPet.name} começou a seguir você!`,
            related_pet_id: currentPet.id,
            is_read: false,
          });
        } else if (isProfessional && user) {
          await supabase.from("notifications").insert({
            pet_id: pet.id,
            type: "follow",
            message: `${profile?.full_name || "Um Profissional"} começou a seguir você!`,
            related_user_id: user.id,
            is_read: false,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao seguir/deixar de seguir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível completar a ação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleInteraction = async (type: "abraco" | "patinha" | "petisco") => {
    if (!currentPet || !pet) return;

    const messages = {
      abraco: `${currentPet.name} enviou um abraço! ❤️`,
      patinha: `${currentPet.name} enviou uma patinha! 🐾`,
      petisco: `${currentPet.name} enviou um petisco! 🍪`,
    };

    await supabase.from("notifications").insert({
      pet_id: pet.id,
      type,
      message: messages[type],
      related_pet_id: currentPet.id,
      is_read: false,
    });

    toast({ title: "Enviado!", description: messages[type] });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-xl py-6 space-y-6">
          <Card className="card-elevated border-0">
            <CardContent className="p-6 text-center space-y-4">
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
              <Skeleton className="h-6 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!pet) {
    return (
      <MainLayout>
        <div className="container max-w-xl py-6">
          <Card className="card-elevated border-0">
            <CardContent className="p-6 text-center">
              <PawPrint className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Pet não encontrado</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isOwnPet = currentPet?.id === pet.id;
  const isFamily = user && pet.user_id === user.id;

  return (
    <MainLayout>
      {/* Header - Esconde o botão de saúde se for o guardião visualizando seu próprio pet ou família */}
      <GuardianPetHeader 
        petName={pet.name} 
        showHealthButton={!isFamily}
      />

      <div className="container max-w-xl px-0 md:px-4 py-0 md:py-6 space-y-0 md:space-y-6">
        <div className="px-4 md:px-0 py-4 md:py-0 space-y-6">
          {/* Perfil Principal */}
          <Card className="card-elevated border-0 overflow-hidden">
            <div className="h-24 gradient-bg" />
            <CardContent className="relative pt-0 pb-6">
              <Avatar className="h-24 w-24 border-4 border-card -mt-12 mx-auto">
                <AvatarImage src={pet.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {pet.name[0]}
                </AvatarFallback>
              </Avatar>

              <div className="text-center mt-4 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl font-heading font-bold">{pet.name}</h1>
                  {isFamily && (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-none">
                      <Users className="h-3 w-3 mr-1" />
                      Família
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {badges.map((badge) => (
                    <BadgeDisplay key={badge.id} badgeType={badge.badge_type} />
                  ))}
                </div>
                <p className="text-muted-foreground">
                  {pet.species} • {pet.breed} • {pet.age} anos
                </p>
                {pet.bio && <p className="text-sm">{pet.bio}</p>}
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-8 mt-4 py-4 border-y border-border">
                <div className="text-center">
                  <p className="text-xl font-bold">{posts.length}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{followersCount}</p>
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{followingCount}</p>
                  <p className="text-xs text-muted-foreground">Seguindo</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {isFamily ? (
                  <>
                    <Button onClick={() => navigate(`/pet/${petId}/health`)} className="gap-2 gradient-bg">
                      <ClipboardList className="h-4 w-4" />
                      Prontuário de Saúde
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/edit-pet/${petId}`)} className="gap-2">
                      <Settings className="h-4 w-4" />
                      Configurações
                    </Button>
                  </>
                ) : (
                  <>
                    {(currentPet || isProfessional) && (
                      <Button
                        onClick={handleFollow}
                        variant={isFollowing ? "outline" : "default"}
                        className={!isFollowing ? "gradient-bg" : ""}
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Deixar de seguir
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Seguir
                          </>
                        )}
                      </Button>
                    )}

                    {(currentPet || isProfessional) && (
                      <Link to={isProfessional ? `/chat/professional/${pet.user_id}` : `/chat/${pet.id}`}>
                        <Button variant="outline" className="gap-2">
                          <MessageCircle className="h-4 w-4" /> Chat
                        </Button>
                      </Link>
                    )}

                    {currentPet && !isFamily && !isProfessional && (
                      <>
                        <Button variant="outline" onClick={() => handleInteraction("abraco")} className="gap-2">
                          <Heart className="h-4 w-4 text-secondary" /> Abraço
                        </Button>
                        <Button variant="outline" onClick={() => handleInteraction("patinha")} className="gap-2">
                          <PawPrint className="h-4 w-4 text-primary" /> Patinha
                        </Button>
                        <Button variant="outline" onClick={() => handleInteraction("petisco")} className="gap-2">
                          <Cookie className="h-4 w-4 text-amber-500" /> Petisco
                        </Button>
                      </>
                    )}

                    {guardianProfile?.account_type === 'professional' && guardianProfile?.professional_whatsapp && (
                      <a 
                        href={`https://wa.me/${guardianProfile.professional_whatsapp.replace(/\D/g, '' )}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button className="bg-green-500 hover:bg-green-600 text-white gap-2">
                          <MessageCircle className="h-4 w-4" /> WhatsApp Profissional
                        </Button>
                      </a>
                    )}

                    {isProfessional && user && petId && (
                      <HealthAccessButton 
                        petId={petId} 
                        professionalId={user.id} 
                        status={healthAccessStatus} 
                        onStatusChange={setHealthAccessStatus}
                        isFollowing={isFollowing}
                        professionalServiceType={profile?.professional_service_type}
                      />
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gerenciamento de Pets (Apenas para o Guardião) */}
          {isFamily && (
            <Card className="card-elevated border-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <PawPrint className="h-4 w-4 text-primary" />
                    Meus Pets
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/create-pet')} className="text-primary hover:text-primary/80 gap-1">
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {myPets.map((myPet) => (
                    <div 
                      key={myPet.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer",
                        myPet.id === pet.id ? "bg-primary/5 border-primary/20" : "hover:bg-muted border-transparent"
                      )}
                      onClick={() => {
                        if (myPet.id !== pet.id) {
                          selectPet(myPet);
                          navigate(`/pet/${myPet.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={myPet.avatar_url || undefined} />
                          <AvatarFallback>{myPet.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm">{myPet.name}</p>
                          <p className="text-xs text-muted-foreground">{myPet.species}</p>
                        </div>
                      </div>
                      {myPet.id === pet.id ? (
                        <Badge variant="secondary" className="text-[10px]">Atual</Badge>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="px-4 md:px-0 space-y-6">
          {/* Posts */}
          {posts.length === 0 ? (
            <Card className="card-elevated border-0">
              <CardContent className="py-12 text-center">
                <PawPrint className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum post ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={{ ...post, pet }} profile={profile} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default PetProfile;
