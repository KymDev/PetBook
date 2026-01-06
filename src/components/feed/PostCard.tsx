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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, MessageCircle, Send, Maximize } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/contexts/UserProfileContext";

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

const reactionTypes = [
  { type: "patinha", emoji: "🐾", label: "Patinha" },
  { type: "abraco", emoji: "❤️", label: "Abraço" },
  { type: "petisco", emoji: "🍖", label: "Petisco" },
];

interface PostCardProps {
  post: Post;
  profile: UserProfile | null;
}

export const PostCard = ({ post, profile }: PostCardProps) => {
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

  const isProfessional = profile?.account_type === 'professional';
  const interactorId = isProfessional ? user?.id : currentPet?.id;
  const isMyPost = currentPet?.id === post.pet_id;

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
    // Usando a View comments_with_profiles para evitar erro de join indireto
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
    const { data: postOwner } = await supabase
      .from("pets")
      .select("user_id")
      .eq("id", post.pet_id)
      .single();

    if (!postOwner) return;
    if (user?.id === postOwner.user_id) return;

    if (isProfessional && user) {
      await supabase.from("notifications").insert({
        pet_id: post.pet_id,
        type: type,
        message: message,
        related_user_id: user.id,
        is_read: false,
      });
    } else if (currentPet) {
      await supabase.from("notifications").insert({
        pet_id: post.pet_id,
        type: type,
        message: message,
        related_pet_id: currentPet.id,
        is_read: false,
      });
    }
  };

  const handleReaction = async (type: string) => {
    if (!interactorId) {
      toast({ title: "Login necessário", description: "Você precisa estar logado ou ter um pet selecionado para reagir.", variant: "destructive" });
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
        const interactorName = isProfessional ? (profile as any)?.full_name || "Um Profissional" : currentPet?.name || "Um Pet";
        await createNotification("reaction", `${interactorName} reagiu com ${reactionLabel} ao seu post`);
      }
      fetchReactions();
    } catch (error) {
      console.error("Erro ao reagir:", error);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    if (!interactorId) {
      toast({ title: "Ação necessária", description: "Você precisa estar logado ou ter um pet selecionado para comentar.", variant: "destructive" });
      return;
    }

     const commentData: any = isProfessional
      ? { user_id: user?.id, text: newComment.trim(), post_id: post.id }
      : { pet_id: currentPet?.id, text: newComment.trim(), post_id: post.id };

    try {
      const { error } = await supabase.from("comments").insert([commentData]);

      if (error) {
        toast({ title: "Erro ao comentar", variant: "destructive" });
        return;
      }

      const interactorName = isProfessional ? (profile as any)?.full_name || "Um Profissional" : currentPet?.name || "Um Pet";
      await createNotification("comment", `${interactorName} comentou no seu post`);

      setNewComment("");
      fetchComments();
      toast({ title: "Comentário adicionado!" });
    } catch (error) {
      console.error("Erro ao comentar:", error);
      toast({ title: "Erro ao comentar", variant: "destructive" });
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Excluir post?")) return;
    await supabase.from("posts").delete().eq("id", post.id);
    toast({ title: "Post excluído!" });
  };

  const handleEditPost = async () => {
    if (!editedDescription.trim()) return;
    await supabase.from("posts").update({ description: editedDescription.trim() }).eq("id", post.id);
    setIsEditing(false);
    post.description = editedDescription.trim();
    toast({ title: "Post editado!" });
  };

  return (
    <Card className="card-elevated border-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <Link to={`/pet/${pet?.id}`} className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={pet?.avatar_url || undefined} />
            <AvatarFallback>{pet?.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{pet?.name || "Carregando..."}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </Link>
        {isMyPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeletePost} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {post.media_url && (
          <div className="relative">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative">
                  <img src={post.media_url} alt="Post" className="w-full object-cover max-h-[500px] cursor-pointer" />
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"><Maximize className="h-4 w-4" /></Button>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl p-0 border-0 bg-transparent">
                <img src={post.media_url} alt="Post" className="w-full h-auto max-h-[90vh] object-contain" />
              </DialogContent>
            </Dialog>
          </div>
        )}
        {isEditing ? (
          <div className="p-4 space-y-2">
            <Input value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleEditPost}>Salvar</Button>
            </div>
          </div>
        ) : post.description && <p className="p-4 text-sm">{post.description}</p>}
      </CardContent>

      <CardFooter className="flex flex-col p-4 pt-0">
        <div className="flex justify-between items-center w-full border-b border-border pb-2">
          <div className="flex gap-2">
            {reactions.map((r) => r.count > 0 && (
              <div key={r.type} className={cn("flex items-center gap-1 p-1 px-2 rounded-full text-xs cursor-pointer transition-colors", r.hasReacted ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80")} onClick={() => handleReaction(r.type)}>
                <span>{reactionTypes.find(rt => rt.type === r.type)?.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)} className="text-muted-foreground hover:text-primary">
            <MessageCircle className="h-4 w-4 mr-1" />{comments.length}
          </Button>
        </div>

        <div className="flex justify-around w-full pt-2">
          {reactionTypes.map((rt) => (
            <Button key={rt.type} variant="ghost" size="sm" className={cn("text-lg transition-transform active:scale-125", userReactionType === rt.type ? "text-primary scale-110" : "text-muted-foreground")} onClick={() => handleReaction(rt.type)}>
              {rt.emoji}
            </Button>
          ))}
        </div>

        {showComments && (
          <div className="w-full mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {comments.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-2">Nenhum comentário ainda. Seja o primeiro!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3 items-start">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={c.pet?.avatar_url || c.user_profile?.avatar_url || undefined} />
                      <AvatarFallback>{(c.pet?.name || c.user_profile?.full_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted p-2 rounded-lg">
                      <p className="font-semibold text-xs">{c.pet?.name || c.user_profile?.full_name}</p>
                      <p className="text-sm">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {interactorId && (
              <div className="flex gap-2 pt-2">
                <Input placeholder="Comentar..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment()} className="h-9 text-sm" />
                <Button onClick={handleComment} size="icon" className="h-9 w-9 flex-shrink-0"><Send className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
