import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, PawPrint } from "lucide-react";

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
  const { currentPet, pets, loading: petLoading } = usePet();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !petLoading && pets.length === 0) {
      navigate("/create-pet");
    }
  }, [pets, petLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setPosts(data);
    }
    setLoading(false);
  };

  if (authLoading || petLoading) {
    return (
      <MainLayout>
        <div className="container max-w-xl py-6 space-y-4">
          {[1, 2, 3].map((i) => (
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
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-xl py-6 space-y-6">
        {/* Create Post CTA */}
        {currentPet && (
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
        )}

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
              <h3 className="text-lg font-semibold mb-2">Nenhum post ainda</h3>
              <p className="text-muted-foreground mb-4">
                Seja o primeiro a compartilhar algo!
              </p>
              <Link to="/create-post">
                <Button className="gradient-bg">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Criar Post
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Feed;
