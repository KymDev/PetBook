import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Image, Video, Type, X, Upload } from "lucide-react";

const CreatePost = () => {
  const { user } = useAuth();
  const { currentPet } = usePet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState<"text" | "photo" | "video">("text");
  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setPostType(file.type.startsWith("video") ? "video" : "photo");
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setPostType("text");
  };

  const uploadMedia = async (): Promise<string | null> => {
    if (!mediaFile || !user) return null;

    const fileExt = mediaFile.name.split(".").pop();
    const fileName = `posts/${user.id}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("petbook-media")
      .upload(fileName, mediaFile);

    if (error) throw error;

    const { data } = supabase.storage.from("petbook-media").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!currentPet || (!description.trim() && !mediaFile)) {
      toast({
        title: "Post vazio",
        description: "Adicione uma descrição ou mídia ao seu post.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        mediaUrl = await uploadMedia();
      }

      const { error } = await supabase.from("posts").insert({
        pet_id: currentPet.id,
        type: postType,
        description: description.trim() || null,
        media_url: mediaUrl,
      });

      if (error) throw error;

      toast({
        title: "Post publicado!",
        description: "Seu post foi compartilhado com sucesso 🎉",
      });

      navigate("/feed");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentPet) {
    navigate("/create-pet");
    return null;
  }

  return (
    <MainLayout>
      <div className="container max-w-xl py-6">
        <Card className="card-elevated border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={currentPet.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentPet.name[0]}
                </AvatarFallback>
              </Avatar>
              <span>Postando como {currentPet.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`O que ${currentPet.name} está fazendo?`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={loading}
            />

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
                {postType === "video" ? (
                  <video src={mediaPreview} controls className="w-full max-h-96 object-contain" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full max-h-96 object-contain" />
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <div>
                    <Image className="h-4 w-4" />
                    Foto
                  </div>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleMediaChange}
                  disabled={loading}
                />
              </label>

              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <div>
                    <Video className="h-4 w-4" />
                    Vídeo
                  </div>
                </Button>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleMediaChange}
                  disabled={loading}
                />
              </label>

              <div className="flex-1" />

              <Button
                onClick={handleSubmit}
                disabled={loading || (!description.trim() && !mediaFile)}
                className="gradient-bg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Publicar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CreatePost;
