import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet } from "@/contexts/PetContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, X, Trash2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
    guardian_instagram_username: string;
  };
}

export default function StoryViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPet } = usePet();
  const [story, setStory] = useState<Story | null>(null);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = story?.media_url?.toLowerCase().match(/\.(mp4|webm|ogg|mov|m4v)$/) || story?.media_url?.includes('video');

  useEffect(() => {
    if (id) {
      fetchStory();
      fetchViewers();
    }
  }, [id]);

  useEffect(() => {
    if (!loading && story && !showViewers) {
      if (isVideo) {
        // Progress for video is handled by onTimeUpdate
        return;
      }
      
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + 1;
        });
      }, 50); // 5 seconds for images
      return () => clearInterval(interval);
    }
  }, [loading, story, showViewers, currentIndex, allStories.length, isVideo]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleVideoEnded = () => {
    handleNext();
  };

  const handleDeleteStory = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este Story? Esta ação é irreversível.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      navigate("/feed");
    } catch (error) {
      console.error("Erro ao excluir story:", error);
    }
  };

  const fetchViewers = async () => {
    const { data, error } = await supabase
      .from("story_views" as any)
      .select(`
        viewer_pet_id,
        viewer_pet:pets(id, name, avatar_url)
      `)
      .eq("story_id", id);

    if (error) {
      console.error("Erro ao buscar visualizadores:", error);
      return;
    }

    const formattedViewers = (data as any[]).map(v => {
      if (v.viewer_pet) {
        return {
          id: v.viewer_pet.id,
          name: v.viewer_pet.name,
          avatar_url: v.viewer_pet.avatar_url,
          type: 'pet',
        };
      }
      return null;
    }).filter(v => v !== null);

    setViewers(formattedViewers);
  };

  const fetchStory = async () => {
    setLoading(true);
    const { data: storyData, error } = await supabase
      .from("stories")
      .select("*, pet:pets(id, name, avatar_url, guardian_instagram_username)")
      .eq("id", id)
      .single();

    if (error || !storyData) {
      console.error("Erro ao buscar story:", error);
      navigate("/feed");
      return;
    }

    setStory(storyData as any);

    const { data: petStories } = await supabase
      .from("stories")
      .select("*, pet:pets(id, name, avatar_url, guardian_instagram_username)")
      .eq("pet_id", storyData.pet_id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (petStories) {
      setAllStories(petStories as any[]);
      const index = petStories.findIndex(s => s.id === id);
      setCurrentIndex(index >= 0 ? index : 0);
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("account_type")
      .eq("id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    const isProfessional = profileData?.account_type === 'professional';
    const userId = (await supabase.auth.getUser()).data.user?.id;

    if (isProfessional && userId) {
      await supabase.from("story_views" as any).upsert({
        story_id: id,
        viewer_user_id: userId,
      }, { onConflict: 'story_id,viewer_user_id' });
    } else if (currentPet && currentPet.id !== storyData.pet_id) {
      await supabase.from("story_views" as any).upsert({
        story_id: id,
        viewer_pet_id: currentPet.id,
      }, { onConflict: 'story_id,viewer_pet_id' });
    }

    setLoading(false);
    setProgress(0);
  };

  const handleNext = () => {
    if (currentIndex < allStories.length - 1) {
      const nextStory = allStories[currentIndex + 1];
      navigate(`/story/${nextStory.id}`);
    } else {
      navigate("/feed");
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevStory = allStories[currentIndex - 1];
      navigate(`/story/${prevStory.id}`);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <Skeleton className="w-full h-full bg-gray-900" />
      </div>
    );
  }

  if (!story) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
        {allStories.map((s, i) => (
          <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ 
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-4 right-4 flex items-center justify-between z-20">
        <Link to={`/pet/${story.pet?.id}`} className="flex items-center gap-2">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={story.pet?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {story.pet?.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="text-white drop-shadow-md">
            <p className="font-semibold text-sm">{story.pet?.name}</p>
            <p className="text-[10px] opacity-80">
              {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {story.pet_id === currentPet?.id && (
            <>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setShowViewers(true)}>
                <Eye className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-red-400 hover:bg-white/20" onClick={handleDeleteStory}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate("/feed")}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Story Content */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 flex">
          <div className="w-1/3 h-full cursor-pointer z-10" onClick={handlePrev} />
          <div className="w-1/3 h-full cursor-pointer z-10" onClick={() => {}} />
          <div className="w-1/3 h-full cursor-pointer z-10" onClick={handleNext} />
        </div>
        
        {isVideo ? (
          <video 
            ref={videoRef}
            src={story.media_url} 
            autoPlay 
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <img src={story.media_url} alt="Story" className="max-w-full max-h-full object-contain" />
        )}

        {story.description && (
          <div className="absolute bottom-10 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-center">
            <p className="text-white text-sm font-medium drop-shadow-md">{story.description}</p>
          </div>
        )}
      </div>

      {/* Viewers Dialog */}
      <Dialog open={showViewers} onOpenChange={setShowViewers}>
        <DialogContent className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto">
          <div className="p-2">
            <h2 className="text-lg font-bold mb-4">Visualizações ({viewers.length})</h2>
            <div className="space-y-4">
              {viewers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhuma visualização ainda.</p>
              ) : (
                viewers.map(viewer => (
                  <Link key={viewer.id} to={`/pet/${viewer.id}`} className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-colors" onClick={() => setShowViewers(false)}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={viewer.avatar_url || undefined} />
                      <AvatarFallback>{viewer.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{viewer.name}</p>
                      <p className="text-xs text-muted-foreground">Pet</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
