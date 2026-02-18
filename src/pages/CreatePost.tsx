import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Image, Video, X, Upload, Stethoscope, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const CreatePost = () => {
  const { user } = useAuth();
  const { currentPet } = usePet();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState<"text" | "photo" | "video">("text");
  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const isProfessional = profile?.account_type === 'professional';

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
    if (!isProfessional && !currentPet) {
      toast({
        title: "Erro",
        description: "Você precisa selecionar um pet para postar.",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim() && !mediaFile) {
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

      // Se for profissional, usamos um pet "fantasma" ou associamos ao perfil
      // Como o banco exige pet_id, precisamos de uma estratégia. 
      // Se o profissional não tem pet, ele deve ter um pet de sistema ou permitir null no banco.
      // Vou assumir que o profissional pode ter um pet que o representa ou buscar o primeiro pet dele.
      
      let targetPetId = currentPet?.id;

      if (isProfessional && !targetPetId) {
        // Buscar se o profissional tem algum pet cadastrado (ex: o pet da clínica)
        const { data: profPets } = await supabase
          .from("pets")
          .select("id")
          .eq("user_id", user?.id)
          .limit(1);
        
        if (profPets && profPets.length > 0) {
          targetPetId = profPets[0].id;
        } else {
          // Se não tiver, precisamos criar um pet representativo para o profissional
          // Para esta correção rápida, vou avisar que ele precisa de um perfil de pet representativo
          // Mas o ideal é que o banco aceite user_id direto no post.
          toast({
            title: "Perfil incompleto",
            description: "Profissionais precisam ter ao menos um perfil de pet representativo (ex: sua clínica) para postar.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("posts").insert({
        pet_id: targetPetId,
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

  const authorName = isProfessional ? profile?.full_name : currentPet?.name;
  const authorAvatar = isProfessional ? profile?.professional_avatar_url : currentPet?.avatar_url;

  return (
    <MainLayout>
      <div className="container max-w-xl py-4 md:py-6 px-0 md:px-4">
        <Card className="card-elevated border-0 md:border rounded-none md:rounded-2xl">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-3 text-base md:text-lg">
              <div className="relative">
                <Avatar className={cn(
                  "h-10 w-10 border-2",
                  isProfessional ? "border-blue-500" : "border-primary/20"
                )}>
                  <AvatarImage src={authorAvatar || undefined} />
                  <AvatarFallback className={isProfessional ? "bg-blue-500 text-white" : "bg-primary text-primary-foreground"}>
                    {isProfessional ? <Stethoscope className="h-5 w-5" /> : authorName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                {isProfessional && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                    <BadgeCheck className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Postando como {authorName}</span>
                {isProfessional && <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Perfil Profissional</span>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <Textarea
              placeholder={isProfessional ? "Compartilhe uma dica ou novidade do seu negócio..." : `O que ${currentPet?.name} está fazendo?`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[150px] md:min-h-[200px] resize-none text-base border-none focus-visible:ring-0 p-0"
              disabled={loading}
            />

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative rounded-lg overflow-hidden bg-muted aspect-square md:aspect-video">
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                {postType === "video" ? (
                  <video src={mediaPreview} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <div className="flex gap-1">
                <label className="cursor-pointer">
                  <Button variant="ghost" size="sm" className="gap-2 rounded-full hover:bg-primary/10 hover:text-primary" asChild>
                    <div>
                      <Image className="h-5 w-5" />
                      <span className="hidden sm:inline">Foto</span>
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
                  <Button variant="ghost" size="sm" className="gap-2 rounded-full hover:bg-primary/10 hover:text-primary" asChild>
                    <div>
                      <Video className="h-5 w-5" />
                      <span className="hidden sm:inline">Vídeo</span>
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
              </div>

              <div className="flex-1" />

              <Button
                onClick={handleSubmit}
                disabled={loading || (!description.trim() && !mediaFile)}
                className={cn("rounded-full px-6", isProfessional ? "bg-blue-600 hover:bg-blue-700" : "gradient-bg")}
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
