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
import { MoreVertical as MoreIcon, Edit as EditIcon, Trash2 as TrashIcon, MessageCircle as CommentIcon, Send as SendIcon, PawPrint, Play } from "lucide-react";

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
  user_profile?: { full_name: string, avatar_url: string | null };
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
    { type: "patinha", emoji: "🐾", label: t("feed.reactions.patinha") },
    { type: "abraco", emoji: "❤️", label: t("feed.reactions.abraco") },
    { type: "petisco", emoji: "🍪", label: t("feed.reactions.petisco") },
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
          avatar_url: c.user_avatar_url 
        } : undefined
      })));
    }
  };

  const createNotification = async (type: string, message: string) => {
    const { data: postOwner, error: ownerError } = await supabase
      .from("pets")
      .select("user_id")
      .eq("id", post.pet_id)
      .single();

    if (ownerError || !postOwner) return;

    if (user?.id === postOwner.user_id) {
      console.log("Auto-interação detectada, ignorando notificação.");
      return;
    }

    const { data: ownerProfile } = await supabase
      .from("user_profiles")
      .select("account_type")
      .eq("id", postOwner.user_id)
      .single();

    const isOwnerProfessional = ownerProfile?.account_type === 'professional';

    const notificationData: any = {
      type: type,
      message: message,
      is_read: false,
      related_post_id: post.id
    };

    if (isOwnerProfessional) {
      notificationData.related_user_id = postOwner.user_id;
    } else {
      notificationData.pet_id = post.pet_id;
    }

    if (isProfessional && user) {
      notificationData.author_user_id = user.id;
    } else if (currentPet) {
      notificationData.related_pet_id = currentPet.id;
    }

    await supabase.from("notifications").insert(notificationData);
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

        const reactionLabel = reactionTypes.find(rt => rt.type === type)?.label || type;
        const interactorName = isProfessional ? profile?.full_name || t("common.professional") : currentPet?.name || t("common.pet");
        await createNotification("reaction", `${interactorName} ${t("feed.reacted_with")} ${reactionLabel} ${t("feed.to_your_post")}`);
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

      const interactorName = isProfessional ? profile?.full_name || t("common.professional") : currentPet?.name || t("common.pet");
      await createNotification("comment", `${interactorName} ${t("feed.commented_on_post")}`);

      setNewComment("");
      fetchComments();
      toast({ title: t("feed.comment_added") });
    } catch (error) {
      console.error("Erro ao comentar:", error);
      toast({ title: t("feed.comment_error"), variant: "destructive" });
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm(t("feed.delete_confirm"))) return;
    await supabase.from("posts").delete().eq("id", post.id);
    toast({ title: t("feed.post_deleted") });
  };

  const handleEditPost = async () => {
    if (!editedDescription.trim()) return;
    await supabase.from("posts").update({ description: editedDescription.trim() }).eq("id", post.id);
    setIsEditing(false);
    post.description = editedDescription.trim();
    toast({ title: t("feed.post_edited") });
  };

  return (
    <>
    <Card className="glass-card glass-shadow-md border-0 md:border overflow-hidden mb-4 md:mb-6 rounded-3xl w-full transition-all duration-300 hover:glass-card-light">
      <CardHeader className="glass-header flex flex-row items-center justify-between p-3 md:p-4 border-b border-white/20 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Link to={`/pet/${pet?.id}`}>
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={pet?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {pet?.name?.[0] || "P"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link to={`/pet/${pet?.id}`} className="font-bold text-sm hover:underline">
              {pet?.name}
            </Link>
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: getDateLocale() })}
            </p>
          </div>
        </div>
        {isMyPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <EditIcon className="h-4 w-4 mr-2" /> {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                <TrashIcon className="h-4 w-4 mr-2" /> {t("common.delete")}
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
              <Button size="sm" onClick={handleEditPost} className="gradient-bg">
                {t("common.save")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {post.description && (
              <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                {post.description}
              </p>
            )}
            {post.media_url && (
              <div 
                className="relative aspect-square md:aspect-video w-full overflow-hidden cursor-pointer group"
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <img 
                    src={post.media_url} 
                    alt="Post media" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
            )}
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col p-0">
        <div className="flex items-center justify-between w-full px-2 py-1 md:px-4 md:py-2 border-t border-white/20 dark:border-white/10">
          <div className="flex items-center gap-1 md:gap-2">
            {reactionTypes.map((rt) => {
              const reaction = reactions.find(r => r.type === rt.type);
              return (
                <Button
                  key={rt.type}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(rt.type)}
                  className={cn(
                    "h-8 md:h-9 px-2 md:px-3 rounded-full gap-1.5 transition-all duration-300",
                    reaction?.hasReacted 
                      ? "bg-primary/10 text-primary hover:bg-primary/20" 
                      : "hover:bg-muted"
                  )}
                >
                  <span className="text-base md:text-lg leading-none">{rt.emoji}</span>
                  {reaction && reaction.count > 0 && (
                    <span className="text-xs font-bold">{reaction.count}</span>
                  )}
                </Button>
              );
            })}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "h-8 md:h-9 px-3 rounded-full gap-2 transition-all duration-300",
              showComments ? "bg-muted" : "hover:bg-muted"
            )}
          >
            <CommentIcon className="h-4 w-4" />
            <span className="text-xs font-bold">{comments.length}</span>
          </Button>
        </div>

        {showComments && (
          <div className="w-full px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-3 pt-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link to={comment.pet_id ? `/pet/${comment.pet_id}` : "#"}>
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={comment.pet?.avatar_url || comment.user_profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-[10px]">
                        {(comment.pet?.name || comment.user_profile?.full_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 bg-muted/50 rounded-2xl px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">
                        {comment.pet?.name || comment.user_profile?.full_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: getDateLocale() })}
                      </p>
                    </div>
                    <p className="text-sm mt-0.5">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Input
                placeholder={t("feed.write_comment")}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                className="rounded-full bg-muted/50 border-0 focus-visible:ring-primary h-9 text-sm"
              />
              <Button 
                size="icon" 
                onClick={handleComment}
                disabled={!newComment.trim()}
                className="h-9 w-9 rounded-full gradient-bg shrink-0"
              >
                <SendIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>

    {post.media_url && (
      <MediaLightbox 
        isOpen={lightboxOpen} 
        onClose={() => setLightboxOpen(false)} 
        mediaUrl={post.media_url} 
        mediaType={post.type === 'video' ? 'video' : 'image'}
        petName={pet?.name}
        description={post.description || undefined}
      />
    )}
    </>
  );
};
