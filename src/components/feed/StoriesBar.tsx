import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Story {
  id: string;
  pet_id: string;
  media_url: string;
  description: string | null;
  created_at: string;
  expires_at: string;
  pet?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  hasViewed?: boolean;
}

export const StoriesBar = () => {
  const { currentPet, myPets } = usePet();
  const { profile } = useUserProfile();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 60000);
    return () => clearInterval(interval);
  }, [currentPet, myPets, profile]);

  const fetchStories = async () => {
    const isProfessional = profile?.account_type === 'professional';
    
    let visiblePetIds: string[] = [];

    if (isProfessional) {
      const { data: recentStoryPets } = await supabase
        .from("stories")
        .select("pet_id")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      
      visiblePetIds = Array.from(new Set(recentStoryPets?.map(s => s.pet_id) || []));
    } else {
      const myPetIds = myPets.map(p => p.id);
      const { data: following } = await supabase
        .from("followers")
        .select("target_pet_id")
        .in("follower_id", myPetIds.length > 0 ? myPetIds : ['00000000-0000-0000-0000-000000000000']);

      const followingPetIds = following?.map(f => f.target_pet_id) || [];
      visiblePetIds = Array.from(new Set([...myPetIds, ...followingPetIds]));
    }

    if (visiblePetIds.length === 0) {
      setStories([]);
      setLoading(false);
      return;
    }

    const { data: storiesData } = await supabase
      .from("stories")
      .select("*, pet:pets(id, name, avatar_url)")
      .in("pet_id", visiblePetIds)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (storiesData) {
      const latestStoriesByPet: Record<string, Story> = {};
      storiesData.forEach(story => {
        if (!latestStoriesByPet[story.pet_id]) {
          latestStoriesByPet[story.pet_id] = story as any;
        }
      });

      const uniqueStories = Object.values(latestStoriesByPet);

      let viewedStoryIds = new Set<string>();
      if (currentPet) {
        const { data: viewsData } = await supabase
          .from("story_views" as any)
          .select("story_id")
          .eq("viewer_pet_id", currentPet.id)
          .in("story_id", uniqueStories.map(s => s.id));

        viewedStoryIds = new Set((viewsData as any[])?.map(v => v.story_id) || []);
      }

      const storiesWithViews = uniqueStories.map(story => ({
        ...story,
        hasViewed: viewedStoryIds.has(story.id)
      }));

      setStories(storiesWithViews);
    }
    
    setLoading(false);
  };

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById("stories-container");
    if (container) {
      const scrollAmount = 280;
      container.scrollLeft += direction === "left" ? -scrollAmount : scrollAmount;
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden p-4 bg-background border-b border-border">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative group bg-background border-b border-border py-4">
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
        onClick={() => scroll("left")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        id="stories-container"
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth px-4"
      >
        {/* Botão de Criar Story (Apenas para Guardiões) */}
        {!profile?.account_type || profile.account_type === 'user' ? (
          <Link to="/create-story" className="flex flex-col items-center gap-1.5 min-w-[72px]">
            <div className="relative">
              <div className="w-16 h-16 rounded-full p-[2px] bg-muted flex items-center justify-center">
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={currentPet?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {currentPet?.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-background">
                <Plus className="h-3 w-3" />
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Seu story</span>
          </Link>
        ) : null}

        {stories.map(story => (
          <Link
            key={story.id}
            to={`/story/${story.id}`}
            className="flex flex-col items-center gap-1.5 min-w-[72px] transition-transform active:scale-95"
          >
            <div className={cn(
              "w-16 h-16 rounded-full p-[2px]",
              story.hasViewed ? "bg-muted" : "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
            )}>
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={story.pet?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {story.pet?.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className={cn(
              "text-[11px] text-center truncate w-16 font-medium",
              story.hasViewed ? "text-muted-foreground" : "text-foreground"
            )}>
              {story.pet?.name}
            </span>
          </Link>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
        onClick={() => scroll("right")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
