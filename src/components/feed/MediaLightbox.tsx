import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X as CloseIcon, Share2 as ShareIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  petName?: string;
  description?: string;
}

export const MediaLightbox = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  petName,
  description,
}: MediaLightboxProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Previne que o estado do histórico seja alterado de forma que o 'back' feche a app
      window.history.pushState({ lightbox: true }, "");
    }

    const handlePopState = () => {
      if (isOpen) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post de ${petName || 'PetBook'}`,
          text: description || 'Confira este post no PetBook!',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copiado!",
          description: "O link do post foi copiado para sua área de transferência.",
        });
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Se o usuário fechar manualmente (clicando fora ou no X), 
      // removemos o estado que adicionamos no histórico para não quebrar o 'voltar' do navegador
      if (window.history.state?.lightbox) {
        window.history.back();
      }
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-screen-lg w-full h-screen md:h-auto md:max-h-[90vh] p-0 border-0 bg-black/90 backdrop-blur-md flex flex-col focus:outline-none outline-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 z-50">
          <div className="flex-1">
            {petName && (
              <h2 className="text-white font-semibold text-lg">{petName}</h2>
            )}
            {description && (
              <p className="text-white/70 text-sm mt-1 line-clamp-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-white/10 rounded-full"
              title="Compartilhar"
            >
              <ShareIcon size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleClose(false)}
              className="text-white hover:bg-white/10 rounded-full"
              title="Fechar (ESC)"
            >
              <CloseIcon size={20} />
            </Button>
          </div>
        </div>

        {/* Media Container */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/50 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}

          {mediaType === 'image' ? (
            <img
              src={mediaUrl}
              alt="Full screen media"
              className="max-w-full max-h-full object-contain"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          ) : (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
              onLoadedData={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          )}
        </div>

        {/* Footer Info */}
        {description && (
          <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-sm">
            <p className="text-white/80 text-sm">{description}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
