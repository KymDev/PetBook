import { useState, useEffect } from "react";
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
import { MoreVertical as MoreIcon, Edit as EditIcon, Trash2 as TrashIcon, MessageCircle as CommentIcon, Send as SendIcon, PawPrint } from "lucide-react";

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
    };

    if (isOwnerProfessional) {
      notificationData.related_user_id = postOwner.user_id;
    } else {
      notificationData.pet_id = post.pet_id;
    }

    if (isProfessional && user) {
      // Professional author logic
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
                <MoreIcon size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                <EditIcon size={14} /> {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeletePost} className="gap-2 text-red-600">
                <TrashIcon size={14} /> {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="glass-content p-0 border-b border-white/20 dark:border-white/10">
        {isEditing ? (
          <div className="p-4 space-y-3">
            <Input 
              value={editedDescription} 
              onChange={(e) => setEditedDescription(e.target.value)}
              className="rounded-xl glass-blur-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditPost} className="rounded-xl">{t("common.save")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl">{t("common.cancel")}</Button>
            </div>
          </div>
        ) : (
          post.description && <p className="px-4 pb-3 text-sm leading-relaxed text-foreground/90">{post.description}</p>
        )}
        
        {post.media_url && (
          <div className="relative aspect-square md:aspect-video bg-muted overflow-hidden rounded-2xl cursor-pointer group" onClick={() => setLightboxOpen(true)}>
            {post.type === 'video' ? (
              <>
                <video 
                  src={post.media_url} 
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                  loop
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                  <div className="bg-white/90 group-hover:bg-white transition-all duration-300 rounded-full p-3 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-transform">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <>
                <img 
                  src={post.media_url} 
                  alt="Post" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center" />
              </>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="glass-footer flex flex-col p-0 border-t border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between w-full px-2 py-1 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center gap-1">
            {reactionTypes.map((rt) => (
              <Button
                key={rt.type}
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(rt.type)}
                className={cn(
                  "h-9 px-2 gap-1.5 rounded-full transition-all",
                  userReactionType === rt.type ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="text-lg">{rt.emoji}</span>
                <span className="text-xs">{reactions.find(r => r.type === rt.type)?.count || 0}</span>
              </Button>
            ))}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowComments(!showComments)}
            className="h-9 px-3 gap-2 rounded-full text-muted-foreground"
          >
            <CommentIcon size={18} />
            <span className="text-xs font-bold">{comments.length}</span>
          </Button>
        </div>

        {showComments && (
          <div className="w-full px-4 py-3 glass-layer-1 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2">
              <Input 
                placeholder={t("feed.write_comment")}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                className="h-9 text-xs rounded-full glass-blur-sm bg-white/50 dark:bg-white/10 border-white/30 dark:border-white/15"
              />
              <Button size="icon" onClick={handleComment} className="h-9 w-9 rounded-full shrink-0">
                <SendIcon size={14} />
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={comment.pet?.avatar_url || comment.user_profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {(comment.pet?.name || comment.user_profile?.full_name || "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 glass-card-light p-2 rounded-2xl rounded-tl-none shadow-sm">
                    <p className="text-[11px] font-bold mb-0.5">
                      {comment.pet?.name || comment.user_profile?.full_name}
                    </p>
                    <p className="text-xs text-foreground/90 leading-snug">{comment.text}</p>
                  </div>
                </div>
              ))}
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
        description={post.description}
      />
    )}
    </>
  );
};
