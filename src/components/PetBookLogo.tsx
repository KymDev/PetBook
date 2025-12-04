import { cn } from "@/lib/utils";

interface PetBookLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const PetBookLogo = ({ className, size = "md" }: PetBookLogoProps) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 64 64"
        className={cn(sizes[size], "flex-shrink-0")}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Paw with Heart */}
        <defs>
          <linearGradient id="pawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(204, 100%, 50%)" />
            <stop offset="100%" stopColor="hsl(340, 100%, 65%)" />
          </linearGradient>
        </defs>
        {/* Main pad */}
        <path
          d="M32 48c-8 0-16-6-16-14s8-14 16-14 16 6 16 14-8 14-16 14z"
          fill="url(#pawGradient)"
        />
        {/* Toe pads */}
        <ellipse cx="20" cy="22" rx="6" ry="7" fill="url(#pawGradient)" />
        <ellipse cx="32" cy="18" rx="6" ry="7" fill="url(#pawGradient)" />
        <ellipse cx="44" cy="22" rx="6" ry="7" fill="url(#pawGradient)" />
        {/* Heart in center */}
        <path
          d="M32 42c0 0-6-4-6-8 0-2 1.5-4 4-4 1.5 0 2.5 1 2 2 0.5-1 1.5-2 2-2 2.5 0 4 2 4 4 0 4-6 8-6 8z"
          fill="white"
        />
      </svg>
      <div className="flex flex-col">
        <span className="font-heading font-bold text-xl gradient-text">PetBook</span>
        {size !== "sm" && (
          <span className="text-xs text-muted-foreground">A rede social do seu melhor amigo</span>
        )}
      </div>
    </div>
  );
};
