import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  PawPrint,
  Cookie,
  ExternalLink,
  UserPlus,
  UserMinus,
  MessageCircle,
} from "lucide-react";

interface Post {
  id: string;
  pet_id: string;
  type: string;
  description: string | null;
  media_url: string | null;
  created_at: string;
}

const PetProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { currentPet } = usePet();
  const { toast } = useToast();
  const [pet, setPet] = useState<Pet | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchPetProfile();
    }
  }, [id, currentPet]);

  const fetchPetProfile = async () => {
    setLoading(true);

    // Fetch pet
    const { data: petData } = await supabase
      .from("pets")
      .select("*")
      .eq("id", id)
      .single();

    if (petData) {
      setPet(petData);

      // Fetch posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("pet_id", id)
        .order("created_at", { ascending: false });

      if (postsData) setPosts(postsData);

      // Fetch follow status
      if (currentPet && currentPet.id !== id) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_pet_id", currentPet.id)
          .eq("following_pet_id", id)
          .maybeSingle();

        setIsFollowing(!!followData);
      }

      // Fetch follow counts
      const { count: followers } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_pet_id", id);

      const { count: following } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_pet_id", id);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!currentPet || !pet) return;

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_pet_id", currentPet.id)
        .eq("following_pet_id", pet.id);

      setIsFollowing(false);
      setFollowersCount((c) => c - 1);
    } else {
      await supabase.from("follows").insert({
        follower_pet_id: currentPet.id,
        following_pet_id: pet.id,
      });

      setIsFollowing(true);
      setFollowersCount((c) => c + 1);

      // Create notification
      await supabase.from("notifications").insert({
        pet_id: pet.id,
        type: "follow",
        message: `${currentPet.name} começou a seguir você!`,
        related_pet_id: currentPet.id,
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
      type: type,
      message: messages[type],
      related_pet_id: currentPet.id,
    });

    toast({
      title: "Enviado!",
      description: messages[type],
    });
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
        {/* Profile Header */}
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
            {!isOwnPet && currentPet && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
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

                <Button
                  variant="outline"
                  onClick={() => handleInteraction("abraco")}
                  className="gap-2"
                >
                  <Heart className="h-4 w-4 text-secondary" />
                  Abraço
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleInteraction("patinha")}
                  className="gap-2"
                >
                  <PawPrint className="h-4 w-4 text-primary" />
                  Patinha
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleInteraction("petisco")}
                  className="gap-2"
                >
                  <Cookie className="h-4 w-4 text-amber-500" />
                  Petisco
                </Button>

                <Link to={`/chat/${pet.id}`}>
                  <Button variant="outline" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </Button>
                </Link>
              </div>
            )}

            {/* Guardian Info */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Guardião</p>
              <div className="flex items-center justify-between">
                <span className="font-medium">{pet.guardian_name}</span>
                <a
                  href={pet.guardian_instagram_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    @{pet.guardian_instagram_username}
                    <ExternalLink className="h-3 w-3" />
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
