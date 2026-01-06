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
import { Heart, PawPrint, Cookie, ExternalLink, UserPlus, UserMinus, MessageCircle, Stethoscope, Settings } from "lucide-react";

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
  const { currentPet, followPet, unfollowPet, isProfessionalFollowing } = usePet();
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

    const { data: badgesData } = await getPetBadges(petId);
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
            message: `${profile?.full_name || "Um Profissional de Serviço"} começou a seguir você!`,
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
      petisco: `${currentPet.name} enviou um petisco! 🍖`,
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

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-6">
        {/* Header */}
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
              <h1 className="text-2xl font-heading font-bold">{pet.name}</h1>
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

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {isOwnPet ? (
                <>
                  <Button onClick={() => navigate(`/pets/${petId}/saude`)} className="gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Registros de Saúde
                  </Button>
                  <Button onClick={() => navigate(`/edit-pet/${petId}`)} variant="outline" className="gap-2">
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

                  {/* Botão de Chat - Visível para Guardiões e Profissionais */}
                  {(currentPet || isProfessional) && (
                    <Link to={isProfessional ? `/chat/professional/${pet.user_id}` : `/chat/${pet.id}`}>
                      <Button variant="outline" className="gap-2">
                        <MessageCircle className="h-4 w-4" /> Chat
                      </Button>
                    </Link>
                  )}

                  {currentPet && (
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

                  {/* Botão de WhatsApp Profissional */}
                  {guardianProfile?.account_type === 'professional' && guardianProfile?.professional_whatsapp && (
                    <a 
                      href={`https://wa.me/${guardianProfile.professional_whatsapp.replace(/\D/g, '' )}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button className="bg-green-500 hover:bg-green-600 text-white gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 2C6.477 2 2 6.477 2 12c0 3.31 1.28 6.31 3.36 8.54l-1.3 3.16 3.36-.88c1.97 1.08 4.2 1.68 6.58 1.68 5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="currentColor"/><path d="M17.5 15.5c-.2-.1-.8-.4-1.2-.5s-.7-.1-1.1.1c-.4.2-.6.7-.8.8s-.4.2-.8.1c-.4-.1-.9-.3-1.7-.8-.6-.4-1.1-.9-1.5-1.4s-.6-.9-.6-1.4c0-.5.1-.8.2-1s.4-.4.6-.6c.2-.2.4-.4.5-.5s.3-.3.4-.5c.1-.2 0-.4 0-.5s-.2-.4-.3-.6c-.1-.2-.3-.5-.5-.7s-.4-.4-.6-.6c-.2-.2-.4-.4-.4-.4s-.3-.2-.4-.2c-.1 0-.3 0-.5 0s-.4.1-.6.3c-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.5 2.5 3.6 3.4s2.5.7 2.9.6c.4-.1.9-.4 1.1-.7s.4-.6.4-.9c.1-.3.1-.5 0-.7z" fill="white"/></svg>
                        WhatsApp Profissional
                      </Button>
                    </a>
                   )}

                  {/* Ações de Saúde - Apenas para Profissionais */}
                  {isProfessional && user && petId && (
                    <HealthAccessButton 
                      petId={petId} 
                      professionalId={user.id} 
                      status={healthAccessStatus} 
                      onStatusChange={setHealthAccessStatus}
                      isFollowing={isFollowing}
                    />
                  )}
                </>
              )}
            </div>

            {/* Guardian Info */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Guardião</p>
              <div className="flex items-center justify-between">
                <span className="font-medium">{pet.guardian_name}</span>
                <a href={pet.guardian_instagram_url || "#"} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    @{pet.guardian_instagram_username} <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <PostCard key={post.id} post={{ ...post, pet }} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PetProfile;
