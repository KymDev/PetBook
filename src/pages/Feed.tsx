import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/feed/PostCard";
import { StoriesBar } from "@/components/feed/StoriesBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, PawPrint } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

interface Post {
  id: string;
  pet_id: string;
  type: string;
  description: string | null;
  media_url: string | null;
  created_at: string;
}

const Feed = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentPet, myPets, loading: petLoading } = usePet();
  const { profile, loading: profileLoading } = useUserProfile();

  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // --- BUSCA POSTS QUANDO O PET ATUAL EXISTE OU É PROFISSIONAL ---
  useEffect(() => {
    if (authLoading || petLoading || profileLoading) return;
    
    const isProfessional = profile?.account_type === 'professional';
    
    if (isProfessional) {
      fetchFeedPostsForProfessional();
    } else if (currentPet) {
      fetchFeedPosts();
    } else {
      setLoading(false);
    }
  }, [currentPet, petLoading, authLoading, profileLoading, profile]);

  const fetchFeedPosts = async () => {
    if (!currentPet) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Pets seguidos
      const { data: following, error: followingError } = await supabase
        .from("followers")
        .select("target_pet_id")
        .eq("follower_id", currentPet.id)
        .eq("is_user_follower", false);

      if (followingError) throw followingError;
      
      const followingPetIds = following?.map(f => f.target_pet_id) || [];
      
      // 2. Incluir o próprio pet
      const visiblePetIds = [...followingPetIds, currentPet.id];

      // 3. Buscar posts ordenados por data
      const { data, error: postsError } = await supabase
        .from("posts")
        .select(`
          *, 
          pet:pet_id(
            id, 
            name, 
            avatar_url, 
            guardian_name,
            user_id
          )
        `)
        .in("pet_id", visiblePetIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      setPosts(data || []);
    } catch (error) {
      console.error("Erro ao buscar posts do feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedPostsForProfessional = async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Buscar os pets seguidos pelo profissional
      const { data: following, error: followingError } = await supabase
        .from("followers")
        .select("target_pet_id")
        .eq("follower_id", user.id)
        .eq("is_user_follower", true);

      if (followingError) throw followingError;

      const followingPetIds = following?.map(f => f.target_pet_id) || [];
      
      // Se não segue ninguém, o feed fica vazio
      if (followingPetIds.length === 0) {
        setPosts([]);
        return;
      }

      // 2. Buscar posts dos pets seguidos
      const { data, error: postsError } = await supabase
        .from("posts")
        .select(`
          *, 
          pet:pet_id(
            id, 
            name, 
            avatar_url, 
            guardian_name,
            user_id
          )
        `)
        .in("pet_id", followingPetIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      setPosts(data || []);
    } catch (error) {
      console.error("Erro ao buscar posts para profissional:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- TELA DE LOADING DO SISTEMA ---
  if (authLoading || petLoading || profileLoading) {
    return <LoadingScreen message="Carregando seu Pet..." />;
  }

  const isProfessional = profile?.account_type === 'professional';

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-6">
        
        {/* STORIES BAR */}
        <StoriesBar />

        {/* Card de criar post - apenas para usuários com pet */}
        {!isProfessional && currentPet ? (
          <Link to="/create-post">
            <Card className="card-elevated border-0 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-full gradient-bg flex items-center justify-center">
                  <PlusCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">O que {currentPet.name} está fazendo?</p>
                  <p className="text-sm text-muted-foreground">
                    Compartilhe um momento especial
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : null}

        {/* Mensagem para profissionais */}
        {isProfessional ? (
          <Card className="card-elevated border-0 bg-gradient-to-br from-secondary/10 to-primary/10">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <PawPrint className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="font-semibold">
                    Bem-vindo, Profissional!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Explore e conecte-se com a comunidade
                  </p>
                </div>
              </div>
              <Link to="/professional-dashboard" className="block">
                <Button className="w-full gradient-bg" size="sm">
                  Acessar Painel de Atendimento
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {/* LOADING DO FEED */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="aspect-square rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (

          /* NENHUM POST */
          <Card className="card-elevated border-0">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <PawPrint className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum post ainda</h3>
              <p className="text-muted-foreground mb-4">
                Siga novos pets ou compartilhe algo!
              </p>
              {!isProfessional && (
                <Link to="/create-post">
                  <Button className="gradient-bg">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Criar Post
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

        ) : (

          /* FEED COM POSTS */
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard key={post.id} post={post} profile={profile} />
            ))}
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default Feed;
