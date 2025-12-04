import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePet, Pet } from "@/contexts/PetContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, ExternalLink, Send } from "lucide-react";

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
  pet: Pet;
}

const reactionTypes = [
  { type: "patinha", emoji: "🐾", label: "Patinha" },
  { type: "abraco", emoji: "❤️", label: "Abraço" },
  { type: "petisco", emoji: "🍖", label: "Petisco" },
  { type: "miado", emoji: "😺", label: "Miado" },
  { type: "latido", emoji: "🐶", label: "Latido" },
  { type: "fofura", emoji: "🐹", label: "Fofura" },
];

interface PostCardProps {
  post: Post;
}

export const PostCard = ({ post }: PostCardProps) => {
  const { currentPet } = usePet();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [pet, setPet] = useState<Pet | null>(post.pet || null);

  useEffect(() => {
    fetchPetAndReactions();
    fetchComments();
  }, [post.id]);

  const fetchPetAndReactions = async () => {
    // Fetch pet info
    if (!post.pet) {
      const { data: petData } = await supabase
        .from("pets")
        .select("*")
        .eq("id", post.pet_id)
        .single();
      if (petData) setPet(petData);
    }

    // Fetch reactions
    const { data: allReactions } = await supabase
      .from("reactions")
      .select("type, pet_id")
      .eq("post_id", post.id);

    if (allReactions) {
      const reactionCounts = reactionTypes.map((rt) => ({
        type: rt.type,
        count: allReactions.filter((r) => r.type === rt.type).length,
        hasReacted: currentPet
          ? allReactions.some((r) => r.type === rt.type && r.pet_id === currentPet.id)
          : false,
      }));
      setReactions(reactionCounts);
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, pet:pets(*)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(10);

    if (data) {
      setComments(data.map((c) => ({ ...c, pet: c.pet as Pet })));
    }
  };

  const handleReaction = async (type: "patinha" | "abraco" | "petisco" | "miado" | "latido" | "fofura") => {
    if (!currentPet) {
      toast({
        title: "Cadastre um pet",
        description: "Você precisa ter um pet cadastrado para reagir.",
        variant: "destructive",
      });
      return;
    }

    const existingReaction = reactions.find((r) => r.type === type);
    if (existingReaction?.hasReacted) {
      // Remove reaction
      await supabase
        .from("reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("pet_id", currentPet.id)
        .eq("type", type as any);
    } else {
      // Add reaction
      await supabase.from("reactions").insert([{
        post_id: post.id,
        pet_id: currentPet.id,
        type: type,
      }]);
    }

    fetchPetAndReactions();
  };

  const handleComment = async () => {
    if (!currentPet || !newComment.trim()) return;

    await supabase.from("comments").insert({
      post_id: post.id,
      pet_id: currentPet.id,
      text: newComment.trim(),
    });

    setNewComment("");
    fetchComments();
  };

  if (!pet) return null;

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card className="card-elevated border-0 overflow-hidden animate-fade-in">
      <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
        <Link to={`/pet/${pet.id}`}>
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={pet.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {pet.name[0]}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link to={`/pet/${pet.id}`} className="font-semibold hover:underline">
            {pet.name}
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a
              href={pet.guardian_instagram_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary flex items-center gap-1"
            >
              @{pet.guardian_instagram_username}
              <ExternalLink className="h-3 w-3" />
            </a>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </CardHeader>

      {post.media_url && (
        <div className="relative aspect-square bg-muted">
          {post.type === "video" ? (
            <video
              src={post.media_url}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={post.media_url}
              alt="Post"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      <CardContent className="pt-4 space-y-3">
        {post.description && (
          <p className="text-sm">
            <Link to={`/pet/${pet.id}`} className="font-semibold mr-1 hover:underline">
              {pet.name}
            </Link>
            {post.description}
          </p>
        )}

        {/* Reactions */}
        <div className="flex flex-wrap gap-1">
          {reactionTypes.map((rt) => {
            const reaction = reactions.find((r) => r.type === rt.type);
            return (
              <Button
                key={rt.type}
                variant={reaction?.hasReacted ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-2 gap-1 ${reaction?.hasReacted ? "gradient-bg" : ""}`}
                onClick={() => handleReaction(rt.type)}
              >
                <span>{rt.emoji}</span>
                {reaction && reaction.count > 0 && (
                  <span className="text-xs">{reaction.count}</span>
                )}
              </Button>
            );
          })}
        </div>

        {totalReactions > 0 && (
          <p className="text-sm text-muted-foreground">
            {totalReactions} {totalReactions === 1 ? "reação" : "reações"}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4" />
          {comments.length > 0
            ? `Ver ${comments.length} comentário${comments.length > 1 ? "s" : ""}`
            : "Comentar"}
        </Button>

        {showComments && (
          <div className="space-y-3 animate-slide-up">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2 text-sm">
                <Link to={`/pet/${comment.pet.id}`}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.pet.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {comment.pet.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link
                    to={`/pet/${comment.pet.id}`}
                    className="font-semibold mr-1 hover:underline"
                  >
                    {comment.pet.name}
                  </Link>
                  <span className="text-muted-foreground">{comment.text}</span>
                </div>
              </div>
            ))}

            {currentPet && (
              <div className="flex gap-2">
                <Input
                  placeholder="Adicione um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                  className="gradient-bg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
