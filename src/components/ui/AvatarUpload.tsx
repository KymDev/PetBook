import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/integrations/supabase/storageService";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  onUploadSuccess: (newUrl: string) => void;
  bucketPath: string; // Ex: 'professional_avatars/user_id.jpg'
  fallbackText: string;
}

export function AvatarUpload({
  currentAvatarUrl,
  onUploadSuccess,
  bucketPath,
  fallbackText,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("O arquivo selecionado não é uma imagem.");
      return;
    }

    setIsUploading(true);
    try {
      const { publicUrl, error } = await uploadFile(file, bucketPath);

      if (error) {
        throw new Error(error.message || "Erro desconhecido ao fazer upload.");
      }

      if (publicUrl) {
        onUploadSuccess(publicUrl);
        toast.success("Foto de perfil atualizada com sucesso!");
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Falha ao atualizar a foto de perfil.");
    } finally {
      setIsUploading(false);
      // Resetar o input para permitir o upload do mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    // A remoção real do storage é mais complexa (requer uma função de delete no storageService)
    // Por enquanto, vamos apenas limpar a URL no estado do componente pai.
    onUploadSuccess(""); // Limpa a URL no componente pai
    toast.info("Foto de perfil removida. Salve as alterações para confirmar.");
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className="w-32 h-32 border-4 border-primary/50">
          <AvatarImage src={currentAvatarUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
            {fallbackText}
          </AvatarFallback>
        </Avatar>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute bottom-0 right-0 rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>
      </div>

      {currentAvatarUrl && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleRemove}
          disabled={isUploading}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Remover Foto
        </Button>
      )}
    </div>
  );
}
