import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { StoriesBar } from "@/components/feed/StoriesBar";
import { PostCard } from "@/components/feed/PostCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PawPrint, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTranslation } from "react-i18next";

const Feed = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { currentPet, loading: petLoading } = usePet();
  const { profile, loading: profileLoading } = useUserProfile();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || petLoading || profileLoading) return;

    if (profile?.account_type === 'professional') {
      fetchProfessionalFeed();
    } else if (currentPet) {
      fetchPetFeed();
    } else {
      fetchGlobalFeed();
    }
  }, [currentPet?.id, profile?.account_type, authLoading, petLoading, profileLoading]);

  const fetchPetFeed = async () => {
    if (!currentPet) return;
    setLoading(true);
    try {
      const { data: followingData } = await supabase
        .from("followers")
        .select("target_pet_id")
        .eq("follower_id", currentPet.id)
        .eq("is_user_follower", false);

      const followingPetIds = followingData?.map(f => f.target_pet_id) || [];
      followingPetIds.push(currentPet.id);

      const { data, error } = await supabase
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

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Erro ao buscar feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalFeed = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Erro ao buscar feed global:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfessionalFeed = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: followingData } = await supabase
        .from("followers")
        .select("target_pet_id")
        .eq("follower_id", user.id)
        .eq("is_user_follower", true);

      const followingPetIds = followingData?.map(f => f.target_pet_id) || [];
      
      if (followingPetIds.length === 0) {
        return fetchGlobalFeed();
      }

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

  if (authLoading || petLoading || profileLoading) {
    return <LoadingScreen message={t("common.loading_pet")} />;
  }

  const isProfessional = profile?.account_type === 'professional';

  return (
    <MainLayout>
      <div className="container max-w-4xl px-0 md:px-4 py-0 md:py-6 space-y-0 md:space-y-6">
        <StoriesBar />
        <div className="px-4 md:px-0 py-4 md:py-0 space-y-6 max-w-xl mx-auto">

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
          <Card className="card-elevated border-0">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <PawPrint className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("common.no_posts_yet")}</h3>
              <p className="text-muted-foreground mb-4">{t("common.follow_new_pets")}</p>
              {!isProfessional && (
                <Link to="/create-post">
                  <Button className="gradient-bg">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {t("common.create_post")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard key={post.id} post={post} profile={profile} />
            ))}
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Feed;
