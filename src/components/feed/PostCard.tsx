import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/contexts/UserProfileContext";
import { useTranslation } from "react-i18next";
import { MediaLightbox } from "./MediaLightbox";

// Usando lucide-react padrão para ícones
import { MoreVertical as MoreIcon, Edit as EditIcon, Trash2 as TrashIcon, MessageCircle as CommentIcon, Send as SendIcon, PawPrint, Play, Heart, Cookie, BadgeCheck, Stethoscope } from "lucide-react";

interface Post {
  id: string;
  pet_id: string;
  type: string;
  description: string | null;
  media_url: string | null;
  created_at: string;
  pet?: Pet;
}

interface Reaction {
  type: string;
  count: number;
  hasReacted: boolean;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  pet_id?: string | null;
  user_id?: string | null;
  pet?: Pet;
  user_profile?: { full_name: string, avatar_url: string | null, account_type?: string };
}

interface PostCardProps {
  post: Post;
  profile: UserProfile | null;
}

export const PostCard = ({ post, profile }: PostCardProps) => {
  const { t, i18n } = useTranslation();
  const { currentPet } = usePet();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [pet, setPet] = useState<Pet | null>(post.pet as Pet || null);
  const [userReactionType, setUserReactionType] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(post.description || "");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(true);

  const reactionTypes = [
    { type: "patinha", emoji: <PawPrint className="h-5 w-5" />, label: t("feed.reactions.patinha"), color: "hover:text-primary" },
    { type: "abraco", emoji: <Heart className="h-5 w-5" />, label: t("feed.reactions.abraco"), color: "hover:text-red-500" },
    { type: "petisco", emoji: <Cookie className="h-5 w-5" />, label: t("feed.reactions.petisco"), color: "hover:text-yellow-600" },
  ];

  const isProfessional = profile?.account_type === 'professional';
  const interactorId = isProfessional ? user?.id : currentPet?.id;
  const isMyPost = currentPet?.id === post.pet_id;

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'en': return enUS;
      case 'es': return es;
      default: return ptBR;
    }
  };

  useEffect(() => {
    fetchReactions();
    fetchComments();
    if (!pet && post.pet_id) {
      fetchPet();
    }
  }, [post.id, interactorId]);

  useEffect(() => {
    if (post.type === 'video' && videoRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              videoRef.current?.play().catch(() => {});
              setIsPaused(false);
            } else {
              videoRef.current?.pause();
              setIsPaused(true);
            }
          });
        },
        { threshold: 0.6 }
      );

      observer.observe(videoRef.current);
      return () => observer.disconnect();
    }
  }, [post.type, post.media_url]);

  const fetchPet = async () => {
    const { data } = await supabase
      .from("pets")
      .select("*")
      .eq("id", post.pet_id)
      .single();
    if (data) setPet(data as Pet);
  };

  const fetchReactions = async () => {
    const { data: allReactions, error } = await supabase
      .from("reactions")
      .select("type, pet_id, user_id")
      .eq("post_id", post.id);

    if (error) {
      console.error("Erro ao buscar reações:", error);
      return;
    }

    if (allReactions) {
      const userReaction = isProfessional
        ? allReactions.find((r) => r.user_id === user?.id)
        : allReactions.find((r) => r.pet_id === currentPet?.id);
      
      setUserReactionType(userReaction ? userReaction.type : null);

      const reactionCounts = reactionTypes.map((rt) => ({
        type: rt.type,
        count: allReactions.filter((r) => r.type === rt.type).length,
        hasReacted: userReaction ? userReaction.type === rt.type : false,
      }));
      setReactions(reactionCounts);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments_with_profiles")
      .select(`
        *, 
        pet:pets(*)
      `)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar comentários:", error);
      return;
    }

    if (data) {
      setComments(data.map((c: any) => ({ 
        ...c, 
        pet: c.pet as Pet,
        user_profile: c.user_id ? { 
          full_name: c.user_full_name, 
          avatar_url: c.user_avatar_url,
          account_type: c.user_account_type
        } : undefined
      })));
    }
  };

  const handleReaction = async (type: string) => {
    if (!interactorId) {
      toast({ title: t("auth.login_required"), description: t("auth.login_to_react"), variant: "destructive" });
      return;
    }

    try {
      if (userReactionType === type) {
        const query = supabase.from("reactions").delete().eq("post_id", post.id);
        if (isProfessional) query.eq("user_id", user?.id);
        else query.eq("pet_id", currentPet?.id);
        await query;
        setUserReactionType(null);
      } else {
        if (userReactionType) {
          const query = supabase.from("reactions").delete().eq("post_id", post.id);
          if (isProfessional) query.eq("user_id", user?.id);
          else query.eq("pet_id", currentPet?.id);
          await query;
        }
        
        const reactionData: any = isProfessional 
          ? { user_id: user?.id, type, post_id: post.id } 
          : { pet_id: currentPet?.id, type, post_id: post.id };

        await supabase.from("reactions").insert([reactionData]);
        setUserReactionType(type);
      }
      fetchReactions();
    } catch (error) {
      console.error("Erro ao reagir:", error);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    if (!interactorId) {
      toast({ title: t("common.action_required"), description: t("feed.login_to_comment"), variant: "destructive" });
      return;
    }

     const commentData: any = isProfessional
      ? { user_id: user?.id, text: newComment.trim(), post_id: post.id }
      : { pet_id: currentPet?.id, text: newComment.trim(), post_id: post.id };

    try {
      const { error } = await supabase.from("comments").insert([commentData]);

      if (error) {
        toast({ title: t("feed.comment_error"), variant: "destructive" });
        return;
      }

      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Erro ao comentar:", error);
    }
  };

  const handleEdit = async () => {
    if (!editedDescription.trim()) return;
    try {
      const { error } = await supabase
        .from("posts")
        .update({ description: editedDescription.trim() })
        .eq("id", post.id);

      if (error) throw error;
      setIsEditing(false);
      toast({ title: t("feed.post_updated") });
    } catch (error) {
      console.error("Erro ao editar post:", error);
      toast({ title: t("feed.update_error"), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;
      toast({ title: t("feed.post_deleted") });
      window.location.reload();
    } catch (error) {
      console.error("Erro ao deletar post:", error);
      toast({ title: t("feed.delete_error"), variant: "destructive" });
    }
  };

  return (
    <Card className="border-0 md:border md:rounded-xl rounded-none shadow-none bg-background w-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4">
        <div className="flex items-center gap-3">
          <Link to={`/pet/${pet?.id}`} className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={pet?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {pet?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none hover:underline">{pet?.name}</span>
              <span className="text-[10px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: getDateLocale() })}
              </span>
            </div>
          </Link>
        </div>

        {isMyPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                <EditIcon className="h-4 w-4" /> {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 gap-2">
                <TrashIcon className="h-4 w-4" /> {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isEditing ? (
          <div className="p-4 space-y-3">
            <Input 
              value={editedDescription} 
              onChange={(e) => setEditedDescription(e.target.value)}
              className="rounded-xl"
            />
            <div className="flex gap-2">
              <Button onClick={handleEdit} size="sm" className="rounded-xl gradient-bg">{t("common.save")}</Button>
              <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" className="rounded-xl">{t("common.cancel")}</Button>
            </div>
          </div>
        ) : (
          post.description && (
            <div className="px-4 pb-3 text-sm leading-relaxed text-foreground/90">
              <span className="font-bold mr-2">{pet?.name}</span>
              {post.description}
            </div>
          )
        )}

        {post.media_url && (
          <div 
            className="relative aspect-square bg-muted/20 cursor-pointer overflow-hidden"
            onClick={() => setLightboxOpen(true)}
          >
            {post.type === 'video' ? (
              <div className="relative w-full h-full">
                <video 
                  ref={videoRef}
                  src={post.media_url} 
                  className="w-full h-full object-cover"
                  loop
                  muted
                  playsInline
                />
                {isPaused && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <Play className="h-12 w-12 text-white/80 fill-white/80" />
                  </div>
                )}
              </div>
            ) : (
              <img 
                src={post.media_url} 
                alt="Post content" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col p-3 gap-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            {reactionTypes.map((rt) => {
              const reaction = reactions.find((r) => r.type === rt.type);
              const count = reaction?.count || 0;
              const hasReacted = reaction?.hasReacted || false;

              return (
                <button
                  key={rt.type}
                  onClick={() => handleReaction(rt.type)}
                  className={cn(
                    "p-2 transition-all active:scale-90 flex items-center gap-1",
                    hasReacted ? "text-primary" : "text-foreground"
                  )}
                >
                  <div className={cn(hasReacted && "animate-bounce")}>
                    {rt.emoji}
                  </div>
                  {count > 0 && <span className="text-xs font-bold">{count}</span>}
                </button>
              );
            })}
            
            <button
              onClick={() => setShowComments(!showComments)}
              className="p-2 text-foreground transition-all active:scale-90 flex items-center gap-1"
            >
              <CommentIcon className="h-6 w-6" />
              {comments.length > 0 && <span className="text-xs font-bold">{comments.length}</span>}
            </button>
          </div>
        </div>

        {showComments && (
          <div className="w-full space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {comments.map((comment) => {
                const isCommentAuthorProf = comment.user_profile?.account_type === 'professional';
                return (
                  <div key={comment.id} className="flex gap-2 text-sm">
                    <span className="font-bold shrink-0">
                      {comment.pet?.name || comment.user_profile?.full_name}
                    </span>
                    <span className="text-foreground/90">{comment.text}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 items-center pt-2 border-t border-border/30">
              <Input
                placeholder={t("feed.add_comment")}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                className="border-0 bg-transparent focus-visible:ring-0 h-8 text-sm p-0"
              />
              <Button 
                onClick={handleComment} 
                variant="ghost"
                size="sm"
                className="text-primary font-bold h-8"
                disabled={!newComment.trim()}
              >
                {t("common.post")}
              </Button>
            </div>
          </div>
        )}
      </CardFooter>

      {lightboxOpen && post.media_url && (
        <MediaLightbox 
          url={post.media_url} 
          type={post.type} 
          onClose={() => setLightboxOpen(false)} 
        />
      )}
    </Card>
  );
};
