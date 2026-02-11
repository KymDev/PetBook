import { cn } from "@/lib/utils";

interface PetBookLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export const PetBookLogo = ({ className, size = "md", showText = true }: PetBookLogoProps) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
    xl: "w-24 h-24",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img 
        src="/logo.png" 
        alt="PetBook Logo" 
        className={cn(sizes[size], "flex-shrink-0 object-contain")}
        onError={(e) => {
          // Fallback caso a imagem não carregue
          e.currentTarget.src = "/favicon.ico";
          e.currentTarget.onerror = (err) => {
            const target = err.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.logo-fallback')) {
              const fallback = document.createElement('div');
              fallback.className = "logo-fallback flex-shrink-0 flex items-center justify-center bg-primary rounded-lg text-white font-bold " + sizes[size];
              fallback.innerHTML = '<span class="' + (size === "sm" ? "text-[10px]" : "text-xs") + '">PB</span>';
              parent.prepend(fallback);
            }
          };
        }}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="font-heading font-bold text-xl gradient-text">PetBook</span>
          {size !== "sm" && (
            <span className="text-xs text-muted-foreground">A rede social do seu melhor amigo</span>
          )}
        </div>
      )}
    </div>
  );
};
