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
import {
  Heart,
  PawPrint,
  Cookie,
  UserPlus,
  UserMinus,
  MessageCircle,
  Settings,
  Users,
  Plus,
  ChevronRight,
  User
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GuardianPetHeader } from "@/components/layout/GuardianPetHeader";
import { useTranslation } from "react-i18next";

interface Post {
  id: string;
  pet_id: string;
  type: string;
  description: string | null;
  media_url: string | null;
  created_at: string;
}

const PetProfile = () => {

  const { t } = useTranslation();

  const { petId } = useParams<{ petId: string }>();

  const { user } = useAuth();

  const {
    currentPet,
    followPet,
    unfollowPet,
    isProfessionalFollowing
  } = usePet();

  const { profile } = useUserProfile();

  const { toast } = useToast();

  const [pet, setPet] = useState<Pet | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);

  const [badges, setBadges] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [followersCount, setFollowersCount] = useState(0);

  const [followingCount, setFollowingCount] = useState(0);

  const isOwnPet = currentPet?.id === pet?.id;

  const isFamily = user && pet?.user_id === user.id;

  const isFollowing = pet && isProfessionalFollowing(pet.id);

  useEffect(() => {

    if (petId) {

      fetchPet();

      fetchPosts();

      fetchBadges();

    }

  }, [petId]);

  const fetchPet = async () => {

    const { data } = await supabase

      .from("pets")

      .select("*")

      .eq("id", petId)

      .single();

    setPet(data);

    setLoading(false);

  };

  const fetchPosts = async () => {

    const { data } = await supabase

      .from("posts")

      .select("*")

      .eq("pet_id", petId)

      .order("created_at", { ascending: false });

    setPosts(data || []);

  };

  const fetchBadges = async () => {

    const result = await getPetBadges(petId!);

    setBadges(result);

  };

  const handleFollow = async () => {

    if (!pet) return;

    if (isFollowing) {

      await unfollowPet(pet.id);

    } else {

      await followPet(pet.id);

    }

  };

  if (loading) {

    return (

      <MainLayout>

        <div className="container max-w-xl py-6 space-y-6">

          <Card>

            <CardContent className="p-6 text-center space-y-4">

              <Skeleton className="h-24 w-24 rounded-full mx-auto" />

              <Skeleton className="h-6 w-32 mx-auto" />

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

          <Card>

            <CardContent className="p-6 text-center">

              <PawPrint className="h-16 w-16 mx-auto mb-4" />

              <p>Pet não encontrado</p>

            </CardContent>

          </Card>

        </div>

      </MainLayout>

    );

  }

  return (

    <MainLayout>

      <div className="max-w-4xl mx-auto">

        <GuardianPetHeader

          petName={pet.name}

          showHealthButton={!isFamily}

        />

        <div className="container max-w-4xl px-4 py-6">

          <div className="max-w-xl mx-auto space-y-6">

            <Card>

              <CardContent className="p-6 text-center">

                <Avatar className="h-24 w-24 mx-auto">

                  <AvatarImage src={pet.avatar_url || undefined} />

                  <AvatarFallback>

                    {pet.name[0]}

                  </AvatarFallback>

                </Avatar>

                <h1 className="text-2xl font-bold mt-4">

                  {pet.name}

                </h1>

                <div className="flex justify-center gap-2 mt-2">

                  {badges.map((badge) => (

                    <BadgeDisplay

                      key={badge.id}

                      badgeType={badge.badge_type}

                    />

                  ))}

                </div>

                {!isOwnPet && (

                  <Button

                    onClick={handleFollow}

                    className="mt-4"

                  >

                    {isFollowing ? "Unfollow" : "Follow"}

                  </Button>

                )}

              </CardContent>

            </Card>

            <div>

              <div className="flex justify-between items-center">

                <h2 className="text-lg font-bold">

                  Posts

                </h2>

                {isOwnPet && (

                  <Button asChild>

                    <Link to="/create-post">

                      <Plus className="h-4 w-4 mr-2" />

                      Novo Post

                    </Link>

                  </Button>

                )}

              </div>

              {posts.length > 0 ? (

                <div className="space-y-4">

                  {posts.map((post) => (

                    <PostCard

                      key={post.id}

                      post={{ ...post, pet }}

                      profile={profile}

                    />

                  ))}

                </div>

              ) : (

                <p className="text-center mt-10">

                  Nenhum post ainda

                </p>

              )}

            </div>

          </div>

        </div>

      </div>

    </MainLayout>

  );

};

export default PetProfile;
