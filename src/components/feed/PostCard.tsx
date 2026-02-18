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
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);

  const reactionTypes = [
    { type: "patinha", emoji: <PawPrint className="h-4 w-4" />, label: t("feed.reactions.patinha"), color: "hover:text-primary" },
    { type: "abraco", emoji: <Heart className="h-4 w-4" />, label: t("feed.reactions.abraco"), color: "hover:text-red-500" },
    { type: "petisco", emoji: <Cookie className="h-4 w-4" />, label: t("feed.reactions.petisco"), color: "hover:text-yellow-600" },
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
    if (pet?.user_id) {
      fetchAuthorProfile(pet.user_id);
    }
  }, [pet]);

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

  const fetchAuthorProfile = async (userId: string) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setAuthorProfile(data as UserProfile);
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

  const createNotification = async (type: string, message: string) => {
    const { data: postOwner, error: ownerError } = await supabase
      .from("pets")
      .select("user_id")
      .eq("id", post.pet_id)
      .single();

    if (ownerError || !postOwner) return;

    if (user?.id === postOwner.user_id) return;

    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", type)
      .eq("related_post_id", post.id)
      .eq(isProfessional ? "author_user_id" : "related_pet_id", isProfessional ? user?.id : currentPet?.id)
      .gt("created_at", new Date(Date.now() - 60000).toISOString())
      .maybeSingle();

    if (existingNotif) return;

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
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast({ title: t("feed.delete_error"), variant: "destructive" });
    } else {
      toast({ title: t("feed.delete_success") });
      window.location.reload();
    }
  };

  const handleEdit = async () => {
    if (!editedDescription.trim()) return;
    const { error } = await supabase
      .from("posts")
      .update({ description: editedDescription.trim() })
      .eq("id", post.id);

    if (error) {
      toast({ title: t("feed.edit_error"), variant: "destructive" });
    } else {
      toast({ title: t("feed.edit_success") });
      setIsEditing(false);
      window.location.reload();
    }
  };

  const isAuthorProfessional = authorProfile?.account_type === 'professional';

  return (
    <Card className={cn(
      "overflow-hidden border-0 shadow-sm mb-4 transition-all duration-300",
      isAuthorProfessional ? "ring-2 ring-blue-500/20 shadow-blue-100/50" : "card-elevated"
    )}>
      <CardHeader className="flex flex-row items-center justify-between p-4 space-y-0">
        <div className="flex items-center gap-3">
          <Link to={`/pet/${post.pet_id}`} className="relative group">
            <Avatar className={cn(
              "h-10 w-10 transition-transform group-hover:scale-105",
              isAuthorProfessional ? "ring-2 ring-blue-500 ring-offset-2" : "ring-1 ring-primary/10"
            )}>
              <AvatarImage src={pet?.avatar_url || undefined} />
              <AvatarFallback className={isAuthorProfessional ? "bg-blue-500 text-white" : "bg-primary/5 text-primary"}>
                {isAuthorProfessional ? <Stethoscope className="h-5 w-5" /> : pet?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            {isAuthorProfessional && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                <BadgeCheck className="h-3 w-3" />
              </div>
            )}
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <Link to={`/pet/${post.pet_id}`} className="font-bold text-sm hover:text-primary transition-colors">
                {pet?.name}
              </Link>
              {isAuthorProfessional && (
                <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-blue-200">
                  {t("common.professional")}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
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
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                <EditIcon className="h-4 w-4" /> {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive">
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
            <div className="px-4 pb-3 text-sm leading-relaxed text-foreground/90 font-medium">
              {post.description}
            </div>
          )
        )}

        {post.media_url && (
          <div 
            className="relative aspect-square bg-muted/20 cursor-pointer overflow-hidden group"
            onClick={() => setLightboxOpen(true)}
          >
            {post.type === 'video' ? (
              <div className="relative w-full h-full">
                <video 
                  ref={videoRef}
                  src={post.media_url} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loop
                  muted
                  playsInline
                />
                {isPaused && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-white/30 backdrop-blur-sm p-4 rounded-full">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <img 
                src={post.media_url} 
                alt="Post content" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col p-4 pt-3 gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            {reactionTypes.map((rt) => {
              const reaction = reactions.find((r) => r.type === rt.type);
              const count = reaction?.count || 0;
              const hasReacted = reaction?.hasReacted || false;

              return (
                <Button
                  key={rt.type}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(rt.type)}
                  className={cn(
                    "h-9 px-3 gap-2 rounded-full transition-all active:scale-90",
                    hasReacted ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                    rt.color
                  )}
                >
                  <div className={cn(hasReacted && "animate-bounce")}>
                    {rt.emoji}
                  </div>
                  {count > 0 && <span className="text-xs font-bold">{count}</span>}
                </Button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "h-9 px-4 gap-2 rounded-full font-bold transition-all",
              showComments ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <CommentIcon className="h-4 w-4" />
            <span className="text-xs">{comments.length}</span>
          </Button>
        </div>

        {showComments && (
          <div className="w-full space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {comments.map((comment) => {
                const isCommentAuthorProf = comment.user_profile?.account_type === 'professional';
                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className={cn(
                      "h-8 w-8 shrink-0",
                      isCommentAuthorProf ? "ring-1 ring-blue-500" : ""
                    )}>
                      <AvatarImage src={comment.pet?.avatar_url || comment.user_profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] font-bold">
                        {isCommentAuthorProf ? <Stethoscope className="h-4 w-4" /> : (comment.pet?.name?.[0] || comment.user_profile?.full_name?.[0] || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "flex-1 p-3 rounded-2xl text-sm shadow-sm",
                      isCommentAuthorProf ? "bg-blue-50 border border-blue-100" : "bg-muted/40"
                    )}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="font-bold text-xs">
                          {comment.pet?.name || comment.user_profile?.full_name}
                        </p>
                        {isCommentAuthorProf && (
                          <BadgeCheck className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <p className="text-foreground/80 leading-snug">{comment.text}</p>
                      <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: getDateLocale() })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 items-center bg-muted/30 p-1.5 rounded-2xl border border-border/50">
              <Input
                placeholder={t("feed.add_comment")}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                className="border-0 bg-transparent focus-visible:ring-0 h-9 text-sm font-medium"
              />
              <Button 
                onClick={handleComment} 
                size="icon" 
                className="h-9 w-9 rounded-xl gradient-bg shrink-0 shadow-sm active:scale-95 transition-transform"
                disabled={!newComment.trim()}
              >
                <SendIcon className="h-4 w-4" />
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
