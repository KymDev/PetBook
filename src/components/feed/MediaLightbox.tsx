import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X as CloseIcon, Share2 as ShareIcon, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
      // Adiciona um estado no histórico para que o botão voltar feche o lightbox
      window.history.pushState({ lightbox: true }, "");
    }

    const handlePopState = (e: PopStateEvent) => {
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
      if (window.history.state?.lightbox) {
        window.history.back();
      }
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-w-none w-full h-full p-0 border-0 bg-black/95 flex flex-col focus:outline-none outline-none z-[100]",
        "animate-in fade-in zoom-in-95 duration-200"
      )}>
        {/* Header - Estilo Instagram */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))] z-[110] bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleClose(false)}
              className="text-white hover:bg-white/10 rounded-full h-10 w-10"
            >
              <ChevronLeft size={28} />
            </Button>
            <div>
              {petName && (
                <h2 className="text-white font-bold text-base leading-tight">{petName}</h2>
              )}
              {description && (
                <p className="text-white/70 text-xs mt-0.5 line-clamp-1 max-w-[200px]">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-white/10 rounded-full h-10 w-10"
            >
              <ShareIcon size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleClose(false)}
              className="text-white hover:bg-white/10 rounded-full h-10 w-10"
            >
              <CloseIcon size={20} />
            </Button>
          </div>
        </div>

        {/* Media Container */}
        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white"></div>
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
              playsInline
              className="max-w-full max-h-full object-contain"
              onLoadedData={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          )}
        </div>

        {/* Footer Info - Estilo Instagram */}
        {description && (
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[110]">
            <p className="text-white text-sm leading-relaxed max-h-[30vh] overflow-y-auto pr-2">
              <span className="font-bold mr-2">{petName}</span>
              {description}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
